# Global Rules

# qa
- **qa** (`skills/qa/SKILL.md`) - interactive QA session: user reports bugs, agent files GitHub issues. Trigger: `/qa` or when user mentions "QA session", "report a bug", or "file an issue".
When the user triggers a QA session, load and follow the qa skill before doing anything else.

## Behavioral Rules

- When the user corrects you, stop and re-read their message. Quote back what they asked for and confirm before proceeding.
- Re-read the user's last message before responding. Follow through on every instruction completely.
- Double-check your output before presenting it. Verify that your changes actually address what the user asked for.
- When stuck, summarize what you've tried and ask the user for guidance instead of retrying the same approach.
- Every few turns, re-read the original request to make sure you haven't drifted from the goal.
