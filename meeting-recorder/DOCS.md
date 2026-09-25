# Meeting Recorder — recording-only architecture

Meeting Recorder has one responsibility: keep a persistent browser session for a manually joined web meeting and produce a durable, finalized **audio-only** recording.

The target HAOS host has already validated:

- persistent Selkies/Chrome sessions while the client UI is disconnected;
- Home Assistant Ingress;
- remote audio, microphone and webcam;
- audio-only recording containing remote audio + forwarded microphone;
- manual and scheduled meeting finalization;
- persistent Google Chrome configuration across add-on restarts/updates.

Version **0.6.0** deliberately removes transcription from this add-on.

## Normal flow

1. Start Meeting Recorder and open its Web UI.
2. Use the persistent remote Google Chrome manually.
3. Navigate to Jitsi, Meet, Teams, Webex or another compatible web meeting and join it yourself.
4. Press **Iniciar grabación** when you want audio capture to start.
5. Optionally configure a scheduled end time.
6. You can close Home Assistant; Chrome and the recording continue in the server.
7. End manually with **Finalizar reunión y grabación**, or let the scheduled end time fire.
8. Meeting Recorder closes the Chrome meeting participant, closes the active audio segment and assembles the final recording.
9. Only after ffprobe validates the assembled audio is it published as `audio.opus`.

Meeting Recorder does not navigate to meetings, fill IDs/PINs or use Playwright.

## Completion contract

There is intentionally no per-session metadata JSON contract.

Each recording gets a directory such as:

```text
/media/meeting-recorder/
  YYYY-MM-DD_HHMMSS_<id>/
    ffmpeg.log
    segments/
      segment_00000.ogg
      segment_00001.ogg
      ...
    segments.txt
    audio.opus
```

The rule for any downstream process is simple:

```text
audio.opus does not exist  -> recording is incomplete/not finalized
audio.opus exists          -> recording is complete and validated
```

To make that rule reliable, Meeting Recorder never writes directly to the final filename during assembly. It creates a temporary file in the same directory, validates its duration with ffprobe, then performs an atomic rename to `audio.opus`.

The app still uses an internal state file at:

```text
/data/meeting-recorder/state.json
```

That file is only for Meeting Recorder's own runtime/recovery/UI state. External consumers must not depend on it.

## Transcription boundary

Transcription is outside Meeting Recorder.

A separate service, automation or future add-on may watch:

```text
/media/meeting-recorder/*/audio.opus
```

and process finalized recordings independently with Whisper or any other STT system.

This separation means:

- a slow or broken transcriber cannot block a new meeting;
- Meeting Recorder does not need Wyoming or a Whisper client library;
- changing STT implementation does not change the recording add-on;
- completed audio remains the stable interface between both systems.

## Persistent Google Chrome profile

Google Chrome uses:

```text
/home/ubuntu/.config/google-chrome
```

Meeting Recorder redirects that profile to persistent app storage:

```text
/data/chrome-profile/google-chrome
```

Chrome preferences, cookies, site permissions, extensions and profile/session state therefore survive normal Meeting Recorder restarts and future app updates.

The persistent profile can contain authenticated sessions and cookies. Treat backups of the add-on data as sensitive.

## Audio topology

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

The recording sink is independent from normal playback, so the local microphone is not intentionally routed back to the user's speakers.

## Configuration

```yaml
shm_size_mb: 2048
segment_seconds: 300
audio_bitrate_kbps: 64
```

## Privacy note about mute

Meeting Recorder records the Selkies virtual microphone source. A meeting application can implement its own mute in software while leaving that source open. Therefore the reliable privacy boundary for the local recording remains the microphone control at the Selkies/client layer.

## Remaining work

- recovery/finalization after a hard host crash using already closed segments;
- recording history/playback UI;
- platform-aware mute semantics if a generic solution is found;
- removal/replacement of the temporary `SYS_ADMIN` / AppArmor compromise used to resize `/dev/shm`.
