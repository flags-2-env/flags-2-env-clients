# Experimental AttoLang host transport admission

`transport_boundary.atto` is source-only and pure. The independent Node
`host_reference.mjs` is test-only, with an injected transport function; it is
**not** a native AttoLang HTTP implementation or proof of compiler execution.

The host must enforce TLS hostname validation, runtime permissions, redirect
refusal, byte budgets, UTF-8/JSON decoding, and typed errors. It must also
prevent bearer forwarding across origins; a caller-controlled Boolean is
not authority. Run `node --test clients/atto/*.test.mjs`.

Promote only after a real AttoLang compiler executes the source and positive
and negative guests match the native host semantics.
