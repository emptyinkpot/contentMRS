@echo off
setlocal
if not defined MARKITDOWN_ENABLE_PLUGINS set "MARKITDOWN_ENABLE_PLUGINS=false"
set "MARKITDOWN_MCP_PYTHON=C:\Users\ASUS-KL\.codex\mcps\integrations\documents\markitdown\packages\markitdown-mcp\.venv\Scripts\python.exe"
"%MARKITDOWN_MCP_PYTHON%" -m markitdown_mcp %*
