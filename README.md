# HA Meeting Recorder

Home Assistant OS app for a persistent remote browser session that:

- stays connected to a web meeting even when the Home Assistant UI is closed;
- opens to a management dashboard with desktop access, live recording status, and downloadable recording history;
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

The app is published with Home Assistant's **stable** lifecycle stage. Version **2.2.0** adds a lightweight Home Assistant-style management dashboard. The original persistent Selkies desktop and recording toolbar remain unchanged behind a dashboard link. Previous MP3 completion and CBR compatibility behavior remains intact.

Transcription is deliberately **outside this app**. Meeting Recorder's output contract is a finalized `audio.mp3` in the session directory. Downstream transcription or processing can consume that file independently.

A final `audio.mp3` is published only after MP3 encoding and validation, using an atomic rename. The output is stereo 48 kHz CBR MP3 without ID3v2 or Xing/Info headers. Existing MP3 files from 2.0.0 are normalized automatically on startup; failed rewrites preserve the original file. Legacy `audio.opus` files retain the same safe migration path. No per-recording JSON marker is required.

The app currently supports **amd64 only**.

## Management dashboard

Home Assistant Ingress opens the **management dashboard** by default. It displays
live recording status, audio readiness, scheduled start/end times, and recording
folders in newest-first order. Open **Escritorio virtual** to enter the existing
Selkies/Chrome desktop; select **Panel** in the recording toolbar to return.

The dashboard follows the device's light/dark color-scheme preference with no
external JavaScript or CSS dependencies. It polls the existing status API and a
read-only `GET /meeting-recorder/api/recordings` endpoint. Each generated
session folder can be expanded; only a finalized, nonempty `audio.mp3` gets a
download link at `GET /meeting-recorder/api/recordings/<session>/audio.mp3`.
Failed or ongoing sessions remain visible but cannot be downloaded as final MP3s.

Selkies is intentionally still served at the ingress root when using
`?desktop=1`; this preserves its relative and absolute asset/WebSocket URLs.
The dashboard, API, and desktop all stay behind Home Assistant Ingress authentication.

Run the read-only API tests with
`python3 -m unittest discover -s meeting-recorder/tests -v`.

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
