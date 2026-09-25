# Meeting Recorder — Phase 3 recording prototype

The persistent Selkies browser, Home Assistant Ingress, audio downlink, microphone forwarding and webcam forwarding have already been validated on the target HAOS host.

Version **0.3.0** adds the first real Meeting Recorder function: **on-demand audio recording**.

## Normal flow

1. Start Meeting Recorder and open its Web UI.
2. Use the persistent remote Chrome manually.
3. Navigate to Jitsi, Meet, Teams, Webex or another compatible meeting site and join the meeting yourself.
4. When you want the recording to begin, press **Iniciar grabación** in the floating Meeting Recorder control bar.
5. You may navigate away from Home Assistant; Selkies, Chromium and FFmpeg continue running in the add-on.
6. Return later and press **Detener grabación**.
7. The add-on closes the current segment, assembles all segments and validates the final audio.

This version does **not** navigate to a meeting, fill Meeting IDs/PINs or use Playwright.

## Where files are stored

Home Assistant maps its writable media directory into the app. Each recording creates:

```text
/media/meeting-recorder/
  YYYY-MM-DD_HHMMSS_<id>/
    session.json
    ffmpeg.log
    segments/
      segment_00000.ogg
      segment_00001.ogg
      ...
    segments.txt
    audio.opus
```

The default segment length is 300 seconds (5 minutes). It can be changed in the app configuration for testing.

## Audio topology

The recording graph is intentionally separate from normal playback:

```text
remote meeting audio
        |
        v
   output.monitor -----------+
                              |
                              v
                       meeting_recorder_mix
                              |
client mic                    +--> meeting_recorder_mix.monitor --> FFmpeg --> Opus segments
   |
   v
SelkiesVirtualMic ------------+
```

The null recording sink is not the desktop's default output. Therefore adding the microphone to the recording does not intentionally route your microphone back to your speakers.

If the virtual microphone is not present at the exact moment recording starts, recording begins with remote/desktop audio and the API keeps checking for the Selkies microphone so it can attach it when it appears.

## Privacy note about mute

This prototype records the **Selkies virtual microphone source**. A conferencing application can implement its mute button in software while keeping the microphone source open. In that situation, Meeting Recorder cannot generically know that Jitsi/Meet/Teams has muted its outbound WebRTC track.

Therefore, for this prototype, the reliable privacy boundary is the microphone control at the Selkies/client layer. Do not assume an in-meeting software mute necessarily removes your microphone from the local recording.

A platform-independent post-application mute signal is not yet implemented.

## Ingress architecture

Home Assistant still sees a single Ingress endpoint on port 8080:

```text
Home Assistant Ingress
        |
        v
Nginx :8080
  |             |
  |             +--> /meeting-recorder/api/* --> control API :8099
  |
  +--> everything else --> Selkies :8081
```

Nginx injects only the Meeting Recorder controls into Selkies' HTML. Streaming and WebSocket traffic continue to be proxied transparently to Selkies.

## Configuration

```yaml
shm_size_mb: 2048
segment_seconds: 300
audio_bitrate_kbps: 64
```

## Test for 0.3.0

Use a short Jitsi call first:

1. Join the test meeting manually.
2. Make sure you can hear the other side and that your mic works.
3. Start recording.
4. Play/receive some remote audio.
5. Speak several clear phrases through the forwarded mic.
6. Leave the recording running for at least 20-30 seconds.
7. Stop recording.
8. Check that the control says the audio was saved.
9. Inspect the app log for the final `audio.opus` path.
10. Play that file from the Home Assistant media storage and verify that it contains both the remote audio and your voice.

If recording fails, capture the add-on log and, when available, the session's `ffmpeg.log`.

## Not implemented yet

- “Finalizar reunión y grabación” as one atomic action.
- Scheduled end time.
- Automatic Whisper/Wyoming transcription.
- Recovery/assembly after a hard host crash beyond preserving already closed segments.
- Recording history UI.
- Platform-aware mute semantics.
- GPU acceleration work.
- Removal of the temporary `SYS_ADMIN` / AppArmor compromise used to resize `/dev/shm`.
