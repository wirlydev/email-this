// PreToolUse hook: append every Bash/PowerShell command Claude runs to
// .claude/logs/bash-commands-YYYY-MM-DD.txt (one file per UTC day;
// one line each: ISO timestamp, tool, command).
const fs = require("fs");
const path = require("path");

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input);
    const cmd = data.tool_input && data.tool_input.command;
    if (!cmd) return;
    const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const now = new Date();
    const day = now.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    const logDir = path.join(dir, ".claude", "logs");
    fs.mkdirSync(logDir, { recursive: true });
    const line =
      now.toISOString() +
      "\t" +
      (data.tool_name || "?") +
      "\t" +
      String(cmd).replace(/\r?\n/g, " ") +
      "\n";
    fs.appendFileSync(path.join(logDir, `bash-commands-${day}.txt`), line);
  } catch {
    // never block a tool call because logging failed
  }
});
