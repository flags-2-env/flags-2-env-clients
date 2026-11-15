# AttoLang client policy (experimental)

This is an **AttoLang source-level, transport-neutral policy module** for a future flags-2-env client. It is **not** a complete or shipping HTTP SDK.

- `can_accept_health` admits a health result only when a trusted host supplies HTTP 200, a successful transport, a bounded response, a decoded body, `ok=true`, and a nonempty service.
- `can_forward_bearer` forbids forwarding an explicitly requested bearer token unless it is nonempty, the transport is secure, and the target has the same trusted origin.
- It never reads ambient environment variables, parses CLI flags, issues HTTP requests, parses JSON, or grants resource permissions.

The host must actually enforce response-size bounds, check the target origin, validate the received JSON shape and version, and apply AttoLang runtime permissions separately. `flags2env` only maps CLI flags to configuration values.

`node --test clients/atto/health_policy_model.test.mjs` runs an independent bounded Boolean-policy model and checks the source contract. This is **not** execution of an AttoLang guest. Before inclusion in the released language support matrix, require compiler-backed AttoLang execution and cross-runtime transport/error tests at pinned commits.

## Rust-first tests

Use `rustc --edition=2021 --test clients/atto/policy_model.rs -o /tmp/atto-policy-model && /tmp/atto-policy-model` to run the stdlib-only host admission tests (160 health cases, 16 bearer cases, 32 request cases, and 768 response cases), plus audited source and manifest checks. GitHub Actions runs this **Rust** suite first. Existing JavaScript transport compatibility tests stay in CI while equivalent native integration coverage is developed; no Python scripts or Python test runners are introduced. Neither suite demonstrates an AttoLang compiler or runtime executing `.atto` code.
