# HA Meeting Recorder

Experimental Home Assistant OS app for a persistent remote browser session that:

- stays connected to a web meeting even when the Home Assistant UI is closed;
- lets the user join any compatible meeting manually in Google Chrome;
- forwards microphone and webcam to that persistent browser session;
- records **audio only**;
- finalizes the meeting manually or at a scheduled time;
- persists the Google Chrome profile across app restarts and updates.

## Current status

**Recording-only architecture.**

The persistent browser, Ingress, audio/video forwarding, audio-only recording, manual/scheduled finalization and Chrome-profile persistence have been validated on the target HAOS host.

Transcription is deliberately **outside this app**. Meeting Recorder's output contract is a finalized `audio.opus` in the session directory. Downstream transcription or processing can consume that file independently.

A final `audio.opus` is published only after assembly and ffprobe validation, using an atomic rename. No per-recording JSON marker is required.

The app currently supports **amd64 only**.

## Repository layout

```text
repository.yaml
meeting-recorder/
  config.yaml
  Dockerfile
  DOCS.md
  CHANGELOG.md
  rootfs/
docs/
  phase-0-test-plan.md
```

## Security note

The current prototype temporarily requests `SYS_ADMIN` and disables AppArmor so it can enlarge `/dev/shm` inside the container. This must be removed or replaced before the MVP is considered hardened.

The browser-facing UI is served through **Home Assistant Ingress**. Home Assistant handles authentication and HTTPS; Selkies listens only on its internal HTTP port and that port is not published on the HAOS host.

The persistent Chrome profile may contain authenticated cookies/session data. Backups containing Meeting Recorder app data should be treated accordingly.

## License

No project license has been selected yet.
