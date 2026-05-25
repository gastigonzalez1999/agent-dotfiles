# mcporter + chrome-devtools config

This skill assumes **mcporter** is installed and configured to call the **chrome-devtools** MCP server attached to your **existing Chrome profile** (not an isolated browser).

## Verify

```bash
mcporter list chrome-devtools --schema
mcporter call chrome-devtools.list_pages --args '{}' --output text
```

Success: output lists your real open tabs.

## If reattach fails

1. Confirm Chrome is running with the profile you use day-to-day.
2. Accept the Chrome **Allow remote debugging?** prompt if shown (Peekaboo can click `Allow` — see main skill).
3. Restart the bridge once: `mcporter daemon restart`, then retry `list_pages`.
4. Do **not** fall back to Playwright/Puppeteer/isolated Chrome for login-heavy flows unless the user explicitly asks.

## Machine-specific paths

- **Peekaboo:** `PEEKABOO_BIN` or `~/bin/peekaboo` or `command -v peekaboo`
- **mcporter config:** usually under your home directory; edit the chrome-devtools server entry to point at your profile attach settings (document your local path here when you customize).

Keep tokens and profile paths out of git. This file is a checklist, not a secrets store.
