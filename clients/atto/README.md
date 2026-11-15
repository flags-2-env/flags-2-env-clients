# AttoLang client policy (experimental)

This is an **AttoLang source-level, transport-neutral policy module** for a future flags-2-env client. It is **not** a complete or shipping HTTP SDK.

- `can_accept_health` admits a health result only when a trusted host supplies HTTP 200, a successful transport, a bounded response, a decoded body, `ok=true`, and a nonempty service.
- `can_forward_bearer` forbids forwarding an explicitly requested bearer token unless it is nonempty, the transport is secure, and the target has the same trusted origin.
- It never reads ambient environment variables, parses CLI flags, issues HTTP requests, parses JSON, or grants resource permissions.

The host must actually enforce response-size bounds, check the target origin, validate the received JSON shape and version, and apply AttoLang runtime permissions separately. `flags2env` only maps CLI flags to configuration values.

`node --test clients/atto/health_policy_model.test.mjs` runs an independent bounded Boolean-policy model and checks the source contract. This is **not** execution of an AttoLang guest. Before inclusion in the released language support matrix, require compiler-backed AttoLang execution and cross-runtime transport/error tests at pinned commits.
