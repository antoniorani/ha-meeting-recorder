# HA Meeting Recorder

Experimental Home Assistant OS app for a persistent remote browser session that will eventually:

- stay connected to a web meeting even when the Home Assistant UI is closed;
- forward microphone and webcam only while the client is attached and explicitly enables them;
- record audio only;
- finalize the meeting manually or at a scheduled time;
- transcribe the finished recording locally with the existing Home Assistant Whisper/Wyoming service.

## Current status

**Phase 0 technical spike.**

This first milestone does **not** record or transcribe meetings yet. Its only purpose is to validate the highest-risk part of the architecture on the target HAOS host:

1. Home Assistant can build and run a Selkies desktop container.
2. The remote desktop is reachable over HTTPS.
3. The desktop/browser process survives closing and reopening the client UI.
4. Microphone and webcam forwarding can be enabled from the Selkies client.
5. Disconnecting the client does not terminate the server-side session.

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

## Development branch

Active work starts in `phase-0-bootstrap`.

## Security note

The Phase 0 spike temporarily requests `SYS_ADMIN` and disables AppArmor so it can enlarge `/dev/shm` inside the container. Selkies recommends a much larger shared-memory allocation than Docker's normal 64 MiB for browser stability.

This is an explicit prototype compromise, not the desired final security posture. The capability must be removed or replaced before the MVP is considered hardened.

## License

No project license has been selected yet.
