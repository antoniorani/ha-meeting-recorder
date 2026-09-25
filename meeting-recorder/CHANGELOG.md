# Changelog

## 0.4.0

- Replace the primary stop control with **Finalizar reunión y grabación**.
- Add a generic meeting finalization endpoint that closes the persistent Chrome participant without any platform-specific DOM automation.
- Finalize any active recording through the same action before returning to the ready state.
- Add a configurable scheduled end time from the Ingress UI.
- Execute the same finalization pipeline when the scheduled time is reached, even if no client is connected.
- Allow changing or cancelling the scheduled end while recording.
- Report browser-running state and scheduled end time through the control API.


## 0.3.1

- Fix recording start failure on HAOS when the API runs as the non-root `ubuntu` user.
- Store persistent recorder state in `/data/meeting-recorder/state.json` instead of writing directly to root-owned `/data`.
- Create and own a dedicated `/data/meeting-recorder` directory at container startup.


## 0.3.0

- Add an internal Nginx gateway in front of Selkies while keeping Home Assistant Ingress on port 8080.
- Move Selkies itself to private port 8081.
- Add a dependency-free local control API on port 8099, reachable only through the Ingress gateway.
- Inject a small recording control panel into the Selkies page without adding another browser/iframe layer.
- Add explicit **Start recording** and **Stop recording** actions.
- Build a dedicated PulseAudio/PipeWire recording mix from the desktop output monitor plus `SelkiesVirtualMic`.
- Keep that recording mix separate from the normal playback sink to avoid microphone feedback.
- Record audio only with FFmpeg/Opus in independently closed segments (5 minutes by default).
- Assemble the segments into `audio.opus` when recording stops and validate its duration with ffprobe.
- Store recordings under `/media/meeting-recorder` and persist per-session metadata.
- Add audio diagnostics and runtime warnings when the virtual microphone is not yet available.
- Add configurable segment duration and Opus bitrate.


## 0.2.1

- Change microphone and webcam policy from `false` to Selkies `demand` mode.
- Pre-create virtual capture devices so Jitsi/Meet/Teams can enumerate them instead of showing `None`.
- Request the real client microphone/camera only while a remote application is actively reading the virtual device.
- Document the distinction between permissions in the outer Home Assistant client and permissions in the inner remote Chrome.


## 0.2.0

- Switch the remote desktop UI to Home Assistant Ingress.
- Open Meeting Recorder inside the Home Assistant app panel instead of a direct external port.
- Let Home Assistant handle browser-facing HTTPS and authentication.
- Serve Selkies over internal HTTP only and disable Selkies Basic Auth under Ingress.
- Stop publishing TCP port 8080 on the Home Assistant host.
- Add a sidebar/panel title and icon.
- Remove the obsolete Selkies username/password options from the app configuration.


## 0.1.1

- Fix Phase 0 startup: hand off to Selkies' real `/etc/container-entrypoint.sh` instead of the nonexistent `/init`.
- Drop from the temporary root wrapper back to the upstream Selkies `ubuntu` user (UID/GID 1000) before starting the session supervisor.
- Keep root only long enough to read Home Assistant options and resize `/dev/shm`.


## 0.1.0

- Create Home Assistant app repository structure.
- Add experimental amd64-only Meeting Recorder app.
- Base Phase 0 on Selkies desktop 2.0.0rc1 / Ubuntu 26.04.
- Expose Selkies HTTPS interface on port 8080.
- Require the user to replace the default Selkies password before startup.
- Enable microphone and webcam forwarding while keeping both off on initial client connection.
- Add a temporary /dev/shm enlargement workaround for the HAOS compatibility spike.
- Add Phase 0 validation documentation.
