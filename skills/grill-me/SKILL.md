---
name: grill-me
description: >-
  Quiz the user on their own codebase to prepare for interviews or deepen understanding. Use when the user asks to be grilled or interviewed about their code.
targets: [cursor]
---

# Grill me (code interview)

## When to use

- You want to be quizzed on **your** codebase to prep for interviews or deepen understanding.
- You ask for flashcards, Socratic Q&A, or “test me on this module.”

## Steps

1. Ask which scope to drill (file, package, feature, or whole repo) and time budget.
2. Infer stack and conventions from the repo; avoid generic trivia unrelated to this code.
3. Start with high-signal questions: data flow, invariants, failure modes, concurrency, security.
4. Mix recall (“what calls X?”) with reasoning (“what breaks if Y?”); increase difficulty after correct answers.
5. After each answer, give the correct framing briefly; if wrong, explain the gap and one fix or study path.
6. Cover at least one boundary: API/DB, auth, or deployment if applicable.
7. End with a short recap: strongest area, weakest area, three topics to study next.
8. Offer optional follow-up: deeper dive on one topic or a second round with harder questions.
