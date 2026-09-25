# Changelog

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
