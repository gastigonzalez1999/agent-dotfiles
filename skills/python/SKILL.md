---
name: python
description: >-
  Application or library work in Python — packaging, typing, async, and tooling. Use when writing or reviewing Python code.
targets: [cursor]
---

# Python

## When to use

- Application or library work in Python: packaging, typing, async, or scientific/tooling stacks.
- Debugging imports, environments, or performance in CPython.

## Steps

1. Use **pinned deps** (`requirements.txt`, `uv.lock`, `poetry.lock`) per environment; document Python version.
2. Prefer **virtual envs** per project; avoid mixing system site-packages.
3. Use **type hints** for public APIs; run **mypy/pyright** if the project adopts them.
4. Structure packages with clear **entry points**; avoid import side effects.
5. For I/O-bound work, consider **async** with clear boundaries; for CPU-bound, use processes or native extensions.
6. Handle **errors** with specific exceptions; log at boundaries with structured context.
7. Test with **pytest**; use fixtures for setup; avoid flaky sleeps—use timeouts and retries explicitly.
8. Profile with **cProfile** or **scalene** before micro-optimizing; watch memory on data-heavy paths.
