# Architectural critique rubric

Use as a checklist. Not every dimension applies to every subsystem; skip irrelevant rows.

| Dimension | Questions |
|-----------|-----------|
| **Boundaries** | Are module/service boundaries clear? Is domain logic mixed with transport/UI/infra? |
| **Coupling** | What breaks if one piece changes? Hidden dependencies between layers or packages? |
| **Cohesion** | Do related behaviors live together, or is logic scattered? |
| **Data flow** | Is ownership of state and mutations clear? Race or consistency risks? |
| **Errors & recovery** | Are failures handled at the right layer? Leaking implementation details to users? |
| **Security & trust** | Authz checks at boundaries? Secrets and trust boundaries where they belong? |
| **Observability** | Enough logging/metrics/tracing hooks for production debugging? |
| **Testability** | Can core logic be tested without heavy integration? Mocks exploding? |
| **Evolution** | How hard is it to add a variant, feature flag, or new integration? |
| **Consistency** | Does this area follow patterns used elsewhere, or is it a one-off? Intentional? |

**Severity hint**

- **High** — Correctness, security, data loss, or unbounded operational risk.
- **Medium** — Maintainability or velocity tax that compounds.
- **Low** — Polish, minor duplication, optional cleanups.
