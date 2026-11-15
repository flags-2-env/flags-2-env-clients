#![forbid(unsafe_code)]

//! Rust host-side regression oracle for the experimental AttoLang admission contracts.
//! These tests verify auditable scalar decisions, not AttoLang compiler/runtime execution.

fn health_admitted(
    status: i32,
    transport_ok: bool,
    within_budget: bool,
    decoded_json: bool,
    health_ok: bool,
    service_nonempty: bool,
) -> bool {
    status == 200 && transport_ok && within_budget && decoded_json && health_ok && service_nonempty
}

fn bearer_forwarded(
    requested: bool,
    nonempty: bool,
    secure: bool,
    same_origin: bool,
) -> bool {
    requested && nonempty && secure && same_origin
}

fn request_admitted(bits: [bool; 5]) -> bool {
    bits.into_iter().all(|value| value)
}

fn response_admitted(
    status: i32,
    body_bytes: i64,
    byte_budget: i64,
    bits: [bool; 4],
) -> bool {
    status == 200
        && body_bytes >= 0
        && byte_budget > 0
        && body_bytes <= byte_budget
        && bits.into_iter().all(|value| value)
}

fn bits<const N: usize>(mask: u32) -> [bool; N] {
    std::array::from_fn(|index| mask & (1 << index) != 0)
}

fn compact(source: &str) -> String {
    source.split_whitespace().collect::<Vec<_>>().join(" ")
}

#[test]
fn health_policy_has_one_valid_combination_in_160() {
    let mut cases = 0;
    let mut successes = 0;
    for status in [0, 199, 200, 201, 401] {
        for mask in 0..32 {
            let input = bits::<5>(mask);
            let admitted = health_admitted(status, input[0], input[1], input[2], input[3], input[4]);
            assert_eq!(admitted, status == 200 && mask == 31, "status={status}, mask={mask}");
            cases += 1;
            successes += usize::from(admitted);
        }
    }
    assert_eq!(cases, 160);
    assert_eq!(successes, 1);
}

#[test]
fn bearer_forwarding_denies_all_but_one_of_16_combinations() {
    for mask in 0..16 {
        let input = bits::<4>(mask);
        assert_eq!(
            bearer_forwarded(input[0], input[1], input[2], input[3]),
            mask == 15,
            "mask={mask}"
        );
    }
}

#[test]
fn request_admission_denies_31_of_32_combinations() {
    for mask in 0..32 {
        assert_eq!(request_admitted(bits::<5>(mask)), mask == 31, "mask={mask}");
    }
}

#[test]
fn response_admission_covers_768_cases_and_boundaries() {
    let mut cases = 0;
    let mut successes = 0;
    for status in [199, 200, 201, 301] {
        for budget in [-1, 0, 8] {
            for body in [-1, 0, 8, 9] {
                for mask in 0..16 {
                    let admitted = response_admitted(status, body, budget, bits::<4>(mask));
                    let expected =
                        status == 200 && budget > 0 && body >= 0 && body <= budget && mask == 15;
                    assert_eq!(
                        admitted, expected,
                        "status={status}, budget={budget}, body={body}, mask={mask}"
                    );
                    cases += 1;
                    successes += usize::from(admitted);
                }
            }
        }
    }
    assert_eq!(cases, 768);
    assert_eq!(successes, 2); // body 0 or 8, with budget 8
}

#[test]
fn response_admission_rejects_redirects_bad_statuses_and_invalid_budgets() {
    assert!(response_admitted(200, 0, 1, [true; 4]));
    assert!(response_admitted(200, 1, 1, [true; 4]));
    assert!(!response_admitted(200, -1, 1, [true; 4]));
    assert!(!response_admitted(200, 0, 0, [true; 4]));
    assert!(!response_admitted(200, 8, 7, [true; 4]));
    assert!(!response_admitted(301, 0, 8, [true; 4]));
    assert!(!response_admitted(200, 0, 8, [true, false, true, true]));
    assert!(!response_admitted(200, 0, 8, [true, true, false, true]));
    assert!(!response_admitted(200, 0, 8, [true, true, true, false]));
}

#[test]
fn atto_sources_match_audited_predicates_not_compiler_proof() {
    let health = compact(include_str!("health_policy.atto"));
    let transport = compact(include_str!("transport_boundary.atto"));
    let manifest = include_str!("manifest.json");
    assert!(health.contains("define module flags_2_env_client as"));
    assert!(health.contains(
        "return status == 200 && transport_ok && within_response_budget && decoded_json && health_ok && service_nonempty;"
    ));
    assert!(health.contains(
        "return token_requested && token_nonempty && transport_secure && same_origin;"
    ));
    assert!(transport.contains(
        "return capability_live && https_only && hostname_valid && same_origin && bearer_safe;"
    ));
    assert!(transport.contains(
        "return transport_ok && status == 200 && body_bytes >= 0 && byte_budget > 0 && body_bytes <= byte_budget && no_redirect && json_shape_valid && protocol_supported;"
    ));
    for fact in [
        "\"experimental-source-only\"",
        "\"runtime_verified\": false",
        "\"http_transport_implemented\": false",
        "\"json_decoder_implemented\": false",
        "\"compiler_backend_verified\": false",
    ] {
        assert!(manifest.contains(fact), "manifest claim changed: {fact}");
    }
}
