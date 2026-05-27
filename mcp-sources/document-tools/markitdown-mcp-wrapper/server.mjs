import { commandOrFallback, relayChild } from "../_shared/win-spawn-relay.mjs";

const command = commandOrFallback(
  "C:\\Users\\ASUS-KL\\.codex\\mcps\\integrations\\documents\\markitdown\\packages\\markitdown-mcp\\.venv\\Scripts\\python.exe",
  [
    "C:\\Users\\ASUS-KL\\.codex\\mcps\\integrations\\documents\\markitdown\\packages\\markitdown-mcp\\.venv\\Scripts\\python.exe",
  ],
);

relayChild({
  command,
  args: ["-m", "markitdown_mcp"],
  env: {
    MARKITDOWN_ENABLE_PLUGINS: process.env.MARKITDOWN_ENABLE_PLUGINS || "false",
  },
});
