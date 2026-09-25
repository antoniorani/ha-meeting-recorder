# Meeting Recorder — Phase 5 persistent Chrome + Whisper

The target HAOS host has already validated:

- persistent Selkies/Chrome sessions while the client UI is disconnected;
- Home Assistant Ingress;
- remote audio, microphone and webcam;
- audio-only recording with remote audio + forwarded microphone;
- manual and scheduled meeting finalization.

Version **0.5.1** keeps those two pieces and improves Whisper observability/reliability. Version 0.5.0 added: a persistent Google Chrome profile and automatic post-meeting Whisper transcription.

## Normal flow

1. Start Meeting Recorder and open its Web UI.
2. Open Google Chrome and manually navigate to any compatible meeting platform.
3. Join the meeting yourself.
4. Press **Iniciar grabación**.
5. Optionally set a scheduled end.
6. Close Home Assistant if you want; the server-side session and recording continue.
7. Finish manually with **Finalizar reunión y grabación**, or let the scheduled end fire.
8. Chrome is closed and the audio is finalized.
9. Only after recording has ended, Meeting Recorder starts Whisper/Wyoming transcription.
10. When Whisper finishes, `transcript.txt` appears next to `audio.opus`.

No Playwright, auto-join, platform-specific selectors, Meeting ID storage or PIN storage are used.

## Persistent Google Chrome profile

Google Chrome stores its Linux user profile under:

```text
/home/ubuntu/.config/google-chrome
```

Meeting Recorder now redirects that path to persistent add-on storage:

```text
/data/chrome-profile/google-chrome
```

This means changes made inside Chrome are preserved across normal add-on restarts and **future Meeting Recorder updates**, including preferences, cookies, site permissions, installed extensions and browser session/profile state.

### Important first-upgrade note

Versions up to 0.4.0 did not persist the Chrome profile outside the container. Therefore the update **to 0.5.0 itself may reset the existing ephemeral Chrome profile one final time**. Once Chrome is configured under 0.5.0, subsequent restarts and updates use the persistent profile.

The persistent Chrome profile can contain authenticated sessions and cookies. Treat Home Assistant backups containing Meeting Recorder add-on data as sensitive.

## Recording files

Each session is stored under:

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
    transcription.log
    transcription.json
    transcript.json
    transcript.txt
```

## Whisper/Wyoming

Meeting Recorder does not include a second Whisper model. It acts as a Wyoming client and sends the completed recording to the Whisper service already running in Home Assistant.

The default configuration is:

```yaml
whisper_enabled: true
whisper_host: core-whisper
whisper_port: 10300
whisper_language: auto
whisper_connect_timeout_seconds: 10
whisper_read_timeout_seconds: 1800
whisper_chunk_seconds: 60
```

When `whisper_language` is `auto`, Meeting Recorder does not override the language configured in the Whisper service. Set it to values such as `es` or `en` if you want Meeting Recorder to explicitly request a language.

Whisper transcription uses independent 60-second chunks by default, regardless of the 5-minute recording segment size. Progress is written to `transcription.json`; every completed chunk is also appended to `transcript.partial.txt`. Once all chunks finish, the final ordered text is written to `transcript.txt`.

If Whisper cannot be reached or returns an error:

- `audio.opus` remains untouched;
- `transcription.json` records the error;
- the overlay shows the error;
- **Reintentar transcripción** runs STT again without repeating the meeting.

A new recording is blocked while transcription is actively running, keeping Meeting Recorder from intentionally competing with Whisper for CPU during another meeting.

## Configuration

```yaml
shm_size_mb: 2048
segment_seconds: 300
audio_bitrate_kbps: 64
whisper_enabled: true
whisper_host: core-whisper
whisper_port: 10300
whisper_language: auto
whisper_connect_timeout_seconds: 10
whisper_read_timeout_seconds: 1800
```

## Validation for 0.5.0

### Chrome persistence

1. Update/install 0.5.0 and start the app.
2. Open Chrome and change an obvious setting, such as the start/homepage behavior, or sign in to a harmless test site.
3. Restart Meeting Recorder.
4. Confirm the setting/session remains.
5. Keep the profile configured for the next app update; the same profile should be reused.

### Whisper

1. Confirm the Home Assistant Whisper add-on/service is running.
2. Make a short recorded test meeting.
3. Finalize the meeting.
4. The overlay should change to **TRANSCRIBIENDO**.
5. Wait for **Transcripción lista**.
6. Open the meeting folder under Home Assistant Media and check `transcript.txt`.
7. Confirm that the text corresponds to both sides of the recorded conversation.

If transcription fails, inspect `transcription.log` and the error shown in the overlay. The recording remains available independently.

## Remaining work

- recovery/assembly after a hard host crash beyond already closed segments;
- recording/transcript history UI;
- platform-aware mute semantics;
- optional transcript formatting/speaker diarization if desired later;
- GPU acceleration work;
- removal of the temporary `SYS_ADMIN` / AppArmor compromise used to resize `/dev/shm`.
