# Meeting Recorder — Phase 0

This build is a technical compatibility spike, not the complete Meeting Recorder MVP.

## Before starting

Open the app **Configuration** tab and replace:

```yaml
selkies_password: CHANGE_ME_BEFORE_START
```

The container deliberately refuses to start while that default value is present. The password is passed to Selkies at runtime and is not printed in logs.

The default username is:

```text
meeting-recorder
```

## Open the remote desktop

The app exposes Selkies on TCP port 8080 over HTTPS.

After starting the app, use **Open Web UI**. Selkies currently uses its own HTTPS certificate, so the browser may show a certificate warning during this spike.

Log in using the username/password configured in the Home Assistant app options.

## Phase 0 test

1. Start the app.
2. Open the Web UI.
3. Launch Google Chrome from the remote desktop.
4. Navigate to any harmless test page.
5. Leave that browser window open.
6. Close the Home Assistant/Selkies client tab completely.
7. Wait at least one minute.
8. Reopen the app Web UI and log in again.
9. Confirm that the same remote desktop and same Chrome window are still present.

Then test microphone and webcam toggles from the Selkies sidebar. They are available but intentionally **off by default** on each client connection.

## Important limitations

- No meeting-platform automation yet.
- No FFmpeg recording yet.
- No audio segmentation yet.
- No scheduled stop yet.
- No Whisper/Wyoming integration yet.
- No Home Assistant Ingress integration yet.
- No GPU acceleration is required for the first test.
- Only `amd64` is declared.
- The app currently uses `SYS_ADMIN` and `apparmor: false` solely for the shared-memory compatibility test.

## Why /dev/shm is handled specially

The upstream Selkies desktop documentation recommends a 2 GiB shared-memory allocation and warns that the usual Docker 64 MiB allocation can crash browsers.

Home Assistant's app configuration does not expose Docker's `--shm-size` option directly. The Phase 0 entrypoint therefore remounts `/dev/shm` using the configurable `shm_size_mb` option (2048 MiB by default).

This implementation is intentionally isolated so we can replace it after testing if a safer HAOS-specific solution is available.

## What success unlocks

Once this test passes on the target HAOS machine, the next development step is to add controlled browser startup and meeting-platform navigation, followed by the virtual audio graph and segmented FFmpeg recording.
