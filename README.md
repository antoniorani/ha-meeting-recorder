# HA Meeting Recorder

Home Assistant OS app for a persistent remote browser session that:

- stays connected to a web meeting even when the Home Assistant UI is closed;
- lets the user join any compatible meeting manually in Google Chrome;
- forwards microphone and webcam to that persistent browser session;
- records **audio only**;
- starts and stops audio recording manually with a single Play/Stop control;
- optionally closes Chrome after a recording finishes, including scheduled endings;
- provides a movable, minimizable recorder toolbar whose layout preference is kept in the browser;
- supports an editable scheduled recording window with independent start and end times;
- publishes finalized recordings as broadly compatible `audio.mp3` files;
- automatically migrates legacy `audio.opus` recordings to MP3 on upgrade;
- removes raw audio segments after 14 days and complete recording folders after 60 days;
- persists the Google Chrome profile across app restarts and updates.

## Current status

**Recording-only architecture.**

The app is published with Home Assistant's **stable** lifecycle stage. Version **2.1.0** adds optional, one-shot Chrome closure after successful manual or scheduled recording finalization. It keeps the MP3 completion contract and CBR compatibility profile introduced in 2.0.1, intended to behave reliably in Windows players as well as Home Assistant.

Transcription is deliberately **outside this app**. Meeting Recorder's output contract is a finalized `audio.mp3` in the session directory. Downstream transcription or processing can consume that file independently.

A final `audio.mp3` is published only after MP3 encoding and validation, using an atomic rename. The output is stereo 48 kHz CBR MP3 without ID3v2 or Xing/Info headers. Existing MP3 files from 2.0.0 are normalized automatically on startup; failed rewrites preserve the original file. Legacy `audio.opus` files retain the same safe migration path. No per-recording JSON marker is required.

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

The current implementation temporarily requests `SYS_ADMIN` and disables AppArmor so it can enlarge `/dev/shm` inside the container. This remains a security hardening item and should be removed or replaced when a compatible `/dev/shm` strategy is available.

The browser-facing UI is served through **Home Assistant Ingress**. Home Assistant handles authentication and HTTPS; Selkies listens only on its internal HTTP port and that port is not published on the HAOS host.

The persistent Chrome profile may contain authenticated cookies/session data. Backups containing Meeting Recorder app data should be treated accordingly.

## License

No project license has been selected yet.
