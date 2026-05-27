# Media Video MCPs

This folder is the categorized home for third-party media/video MCP sources under the canonical root:

- `E:\My Project\Atramenti-Console\codex\mcps\media\video`

Downloaded sources:

- `ffmpeg-mcp`
  - source: `https://github.com/egoist/ffmpeg-mcp`
  - purpose: stdio MCP for common FFmpeg media operations
  - repo wrapper: `E:\My Project\Atramenti-Console\codex\mcps\media\video\ffmpeg-mcp\start.cmd`
  - active global config: yes
- `yt-dlp-mcp`
  - source: `https://github.com/kevinwatt/yt-dlp-mcp`
  - purpose: video metadata, subtitles, transcripts, and downloads through yt-dlp
  - repo wrapper: `E:\My Project\Atramenti-Console\codex\mcps\media\video\yt-dlp-mcp\start.cmd`
  - active global config: yes
- `video-audio-mcp`
  - source: `https://github.com/misbahsy/video-audio-mcp`
  - purpose: larger FFmpeg-based video/audio editing MCP with trimming, overlays, transitions, and audio tools
  - repo wrapper: `E:\My Project\Atramenti-Console\codex\mcps\media\video\video-audio-mcp\start.cmd`
  - active global config: yes

Notes:

- `ffmpeg-mcp` and `yt-dlp-mcp` are now wired into `C:\Users\ASUS-KL\.codex\config.toml` through repo-local start wrappers.
- `video-audio-mcp` is also wired into `C:\Users\ASUS-KL\.codex\config.toml` and uses a local Python 3.13 virtual environment under its repo.
- Keep third-party MCP sources here; only promote one into active global MCP config after its runtime command is verified.
