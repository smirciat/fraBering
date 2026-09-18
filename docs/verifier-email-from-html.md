# Formatted verification email (Gmail)

Use this when you want **headings and bullets** in an email to a reporter (e.g. Nate) without fighting Gmail markdown.

Gmail does **not** accept Markdown from Cursor/chat. It does accept **HTML copied from a browser**.

## Recommended path (Mac)

1. In Cursor (or git), open **`docs/<name>.html`** (example: `docs/nate-rot-verification-email-2026-09.html`).
2. **Right‑click the file → Download** (or copy the file to your Mac via your usual sync/scp).
3. On the Mac, open **Finder** → Downloads (or wherever the file landed).
4. **Double‑click** the `.html` file. It opens in **Safari** or **Chrome**.
5. **⌘A** (select all) → **⌘C** (copy).
6. In **Gmail → Compose**, click in the **message body** (not the subject) → **⌘V** (paste).
7. Set the **subject** manually (see the `.txt` twin file or the email draft notes).

Formatting (bold, section headings, lists) should survive the paste.

## Plain-text fallback

Same basename with **`.txt`** — copies cleanly but no bold/headings.  
Example: `docs/nate-rot-verification-email-2026-09.txt`

## What not to use

| Approach | Problem |
|----------|---------|
| Paste from Cursor chat | Tables/markdown break |
| `http://localhost:8765/...` on your laptop | Server runs on **remote** dev host unless you port-forward |
| `file:///home/andy/...` in a local browser | Path is on the **server**, not your Mac |

## After verification batch

Pair with **Issues** workflow: mark items `ready_for_review` + comment via  
`scripts/issue-rfr-nate-rot-sep2026/index.js` (or `scripts/issue-comment/index.js --no-email`).  
Send the overview email yourself so reporters get one organized message instead of 18 system emails.
