# Meeting Recorder — Phase 0

This build is a technical compatibility spike, not the complete Meeting Recorder MVP.

## Open the remote desktop

Meeting Recorder now uses **Home Assistant Ingress**.

Start the app and press **Open Web UI**. The remote desktop should open inside the Home Assistant interface, in the same browser tab and with the normal Home Assistant chrome, similar to ESPHome and other ingress-enabled apps.

Home Assistant handles HTTPS and authentication. Selkies only listens on plain HTTP port 8080 inside the private add-on network; port 8080 is not published to the host and Selkies does not present a second login screen.

## Phase 0 test

1. Start the app.
2. Press **Open Web UI**.
3. Confirm the Selkies desktop opens inside Home Assistant rather than in a separate direct-port tab.
4. Launch Google Chrome from the remote desktop.
5. Navigate to any harmless test page.
6. Leave that browser window open.
7. Navigate away from Meeting Recorder or close the Home Assistant browser tab completely.
8. Wait at least one minute.
9. Return to Meeting Recorder through Home Assistant.
10. Confirm that the same remote desktop and same Chrome window are still present.

Then test microphone and webcam toggles from the Selkies sidebar. They are available but intentionally **off by default** on each client connection.

## Why Ingress

Home Assistant Ingress proxies HTTP and WebSocket traffic from the Home Assistant origin to the app. This gives us:

- the same-tab Home Assistant experience;
- Home Assistant authentication instead of a second Selkies login;
- HTTPS at the browser even though the internal Selkies hop is HTTP;
- no directly published Selkies port.

Selkies' WebSocket client derives its route prefix from the URL it is loaded from, so it is suitable for a path-based reverse proxy such as Home Assistant Ingress.

## Important limitations

- No meeting-platform automation yet.
- No FFmpeg recording yet.
- No audio segmentation yet.
- No scheduled stop yet.
- No Whisper/Wyoming integration yet.
- No GPU acceleration is required for the first test.
- Only `amd64` is declared.
- The app currently uses `SYS_ADMIN` and `apparmor: false` solely for the shared-memory compatibility test.
- Microphone and webcam through the Home Assistant ingress iframe still need to be verified on the actual desktop/mobile clients.

## Why /dev/shm is handled specially

The upstream Selkies desktop documentation recommends a 2 GiB shared-memory allocation and warns that the usual Docker 64 MiB allocation can crash browsers.

Home Assistant's app configuration does not expose Docker's `--shm-size` option directly. The Phase 0 entrypoint therefore remounts `/dev/shm` using the configurable `shm_size_mb` option (2048 MiB by default).

This implementation is intentionally isolated so we can replace it after testing if a safer HAOS-specific solution is available.

## What success unlocks

Once this test passes on the target HAOS machine, the next development step is to add controlled browser startup and meeting-platform navigation, followed by the virtual audio graph and segmented FFmpeg recording.
