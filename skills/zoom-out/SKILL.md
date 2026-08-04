---
name: zoom-out
description: Tell the agent to zoom out and give broader context or a higher-level perspective. Use when you're unfamiliar with a section of code or need to understand how it fits into the bigger picture.
disable-model-invocation: true
targets: [claude, cursor, codex]
---

I don't know this area of code well. Go up a layer of abstraction. Give me a map of all the relevant modules and callers, using the project's domain glossary vocabulary.

---

*Adopted from [mattpocock/skills](https://github.com/mattpocock/skills) (MIT) on 2026-08-04, after it was removed upstream. Maintained here because a
deleted upstream skill cannot be installed by reference.*
