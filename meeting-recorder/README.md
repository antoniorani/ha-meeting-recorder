# Meeting Recorder

Home Assistant OS app.

Current release `2.0.0` is a stable Home Assistant app on amd64 that publishes finalized recordings as MP3, migrates retained legacy Opus recordings on upgrade, and keeps the existing persistent browser, scheduling, retention, and movable/minimizable recorder toolbar.

The UI is exposed through **Home Assistant Ingress**, so **Open Web UI** should keep the user inside Home Assistant rather than opening a direct Selkies port in a separate tab.

See `DOCS.md` before testing microphone, webcam and session persistence.
