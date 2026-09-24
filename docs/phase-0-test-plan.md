# Phase 0 test plan

## Goal

Validate that a persistent Selkies desktop/browser session can run as a Home Assistant OS app on the target amd64 host and remain alive when the viewing client disconnects.

## Acceptance checks

| ID | Check | Expected result |
| --- | --- | --- |
| P0-01 | Repository installs in Home Assistant | Meeting Recorder appears as an experimental app |
| P0-02 | Image builds on target HAOS host | Build completes without architecture errors |
| P0-03 | Default password guard | App refuses to start until the default password is replaced |
| P0-04 | Selkies starts | TCP 8080 becomes reachable and Web UI opens |
| P0-05 | Browser launches | Google Chrome can be started inside the remote desktop |
| P0-06 | Session survives client close | Closing the client does not terminate desktop/Chrome |
| P0-07 | Session survives reconnect | Reopening shows the same desktop and browser window |
| P0-08 | Audio downlink | Remote desktop audio can be heard by the viewing client |
| P0-09 | Microphone control | Client microphone can be enabled and is off initially |
| P0-10 | Webcam control | Client webcam can be enabled and is off initially |
| P0-11 | Client disconnect privacy | After disconnect, no client mic/webcam stream remains attached |
| P0-12 | Shared memory | Container reports the configured /dev/shm size |

## Evidence to collect

For the first run, save:

- Home Assistant version and Home Assistant OS version.
- App build log if the image fails to build.
- App runtime log from startup through first successful connection.
- Whether the browser shows a self-signed certificate warning.
- Whether audio, microphone and webcam each work.
- Whether the same Chrome window remains after disconnect/reconnect.
- Approximate idle CPU and RAM usage once the desktop is stable.

Do not paste meeting IDs, PINs, cookies, passwords or authentication tokens into issues or logs.

## Failure classification

### Build failure

Capture the final 100-200 lines of the build log. This normally points to an upstream image, architecture or Supervisor build incompatibility.

### Startup failure before port 8080

Check whether the error mentions the default password, `mount`, `/dev/shm`, AppArmor or `SYS_ADMIN`.

### Selkies loads but Chrome crashes

First verify the effective size of `/dev/shm`. Browser stability with the normal Docker 64 MiB shared-memory allocation is a known upstream concern.

### Reconnect creates a fresh desktop

Treat as a Phase 0 blocker. The architecture depends on the server-side session surviving client disconnect.

### Microphone/webcam unavailable

Record browser, client OS, whether Home Assistant itself is served over HTTPS, and the exact permission error. Secure-context and browser permission behavior will determine whether the final UI can use Ingress or needs a separate HTTPS endpoint.
