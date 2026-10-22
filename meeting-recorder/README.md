# Meeting Recorder

Home Assistant OS app.

Current release `2.1.0` is a stable Home Assistant app on amd64 that publishes finalized recordings as Windows-compatible CBR MP3, normalizes MP3 files created by 2.0.0 on startup, migrates retained legacy Opus recordings, and optionally closes Chrome after recording finishes via a compact toolbar checkbox.

The UI is exposed through **Home Assistant Ingress**, so **Open Web UI** should keep the user inside Home Assistant rather than opening a direct Selkies port in a separate tab.

See `DOCS.md` before testing microphone, webcam and session persistence.
