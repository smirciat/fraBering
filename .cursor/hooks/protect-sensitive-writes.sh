#!/usr/bin/env bash
# Prompt before writing to protected config, auth, or bootstrap files.
set -euo pipefail

input=$(cat)

python3 - <<'PY' "$input"
import json, sys, re

data = json.loads(sys.argv[1])
tool_input = data.get("tool_input") or {}
file_path = (
    tool_input.get("path")
    or tool_input.get("file_path")
    or tool_input.get("target_file")
    or ""
)

PROTECTED_PATTERNS = [
    (r"(^|/)server/config/local\.env\.js$", "local secrets file"),
    (r"(^|/)server/config/environment/development\.js$", "local development config"),
    (r"(^|/)server/firebase\.json$", "Firebase credentials"),
    (r"(^|/)\.env$", "environment secrets"),
    (r"(^|/)docker\.env$", "Docker secrets"),
    (r"(^|/)server/app\.js$", "server bootstrap and scheduled jobs"),
    (r"(^|/)server/auth/", "authentication middleware"),
    (r"(^|/)server/config/environment/production\.js$", "production config"),
    (r"\.sqlite$", "SQLite database file"),
]

for pattern, label in PROTECTED_PATTERNS:
    if re.search(pattern, file_path):
        print(json.dumps({
            "permission": "ask",
            "user_message": f"Protected {label}: {file_path}. Confirm before allowing this edit.",
            "agent_message": f"Editing protected file ({label}). Keep changes minimal and avoid secrets in tracked files."
        }))
        sys.exit(0)

print(json.dumps({"permission": "allow"}))
PY
