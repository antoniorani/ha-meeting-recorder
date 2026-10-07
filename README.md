# HA Meeting Recorder

Home Assistant OS app for a persistent remote browser session that:

- stays connected to a web meeting even when the Home Assistant UI is closed;
- lets the user join any compatible meeting manually in Google Chrome;
- forwards microphone and webcam to that persistent browser session;
- records **audio only**;
- starts and stops audio recording manually with a single Play/Stop control;
- provides a movable, minimizable recorder toolbar whose layout preference is kept in the browser;
- supports an editable scheduled recording window with independent start and end times;
- removes raw audio segments after 14 days and complete recording folders after 60 days;
- persists the Google Chrome profile across app restarts and updates.

## Current status

**Recording-only architecture.**

The app is now published with Home Assistant's **stable** lifecycle stage. The persistent browser, Ingress, audio/video forwarding, audio-only recording, generic meeting finalization and Chrome-profile persistence have been validated on the target HAOS host. New 1.0.0 toolbar interactions should still receive a target-host smoke test after upgrade.

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

The current implementation temporarily requests `SYS_ADMIN` and disables AppArmor so it can enlarge `/dev/shm` inside the container. This remains a security hardening item and should be removed or replaced when a compatible `/dev/shm` strategy is available.

The browser-facing UI is served through **Home Assistant Ingress**. Home Assistant handles authentication and HTTPS; Selkies listens only on its internal HTTP port and that port is not published on the HAOS host.

The persistent Chrome profile may contain authenticated cookies/session data. Backups containing Meeting Recorder app data should be treated accordingly.

## License

No project license has been selected yet.
