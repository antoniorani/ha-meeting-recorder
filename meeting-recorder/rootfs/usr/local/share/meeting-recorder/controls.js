(() => {
  "use strict";

  if (window.__meetingRecorderControlsLoaded) return;
  window.__meetingRecorderControlsLoaded = true;

  const script =
    document.currentScript ||
    document.querySelector('script[src*="meeting-recorder/controls.js"]');
  if (!script) return;

  const apiBase = new URL("api/", script.src);

  const style = document.createElement("style");
  style.textContent = `
    #mr-control {
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-radius: 14px;
      background: rgba(20, 20, 24, .94);
      color: #fff;
      font: 600 13px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      box-shadow: 0 4px 24px rgba(0, 0, 0, .35);
      backdrop-filter: blur(8px);
      max-width: calc(100vw - 24px);
      flex-wrap: wrap;
    }
    #mr-control button,
    #mr-control input {
      border: 0;
      border-radius: 10px;
      padding: 9px 12px;
      font: inherit;
      touch-action: manipulation;
    }
    #mr-control button { cursor: pointer; }
    #mr-start { background: #e34ba9; color: #111; }
    #mr-finish { background: #f3f3f3; color: #111; }
    #mr-schedule { background: #ded6ff; color: #111; }
    #mr-cancel-schedule { background: #3b3b42; color: #fff; }
    #mr-retry-transcription { background: #4b3d66; color: #fff; }
    #mr-retry-transcription[hidden] { display: none; }
    #mr-end-time {
      background: #fff;
      color: #111;
      min-width: 190px;
    }
    #mr-control button:disabled,
    #mr-control input:disabled {
      opacity: .45;
      cursor: default;
    }
    #mr-state {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      min-width: 82px;
    }
    #mr-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #777;
      flex: 0 0 auto;
    }
    #mr-control.recording #mr-dot {
      background: #ff334f;
      box-shadow: 0 0 0 4px rgba(255, 51, 79, .18);
    }
    #mr-control.transcribing #mr-dot {
      background: #b798ff;
      box-shadow: 0 0 0 4px rgba(183, 152, 255, .18);
    }
    #mr-scheduled {
      color: #ddd;
      white-space: nowrap;
      font-weight: 500;
    }
    #mr-msg {
      max-width: 320px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #ffb6c7;
      font-weight: 500;
    }
    @media (max-width: 780px) {
      #mr-control {
        top: 8px;
        right: 8px;
        left: 8px;
        justify-content: center;
      }
      #mr-end-time {
        min-width: 170px;
        flex: 1 1 170px;
      }
      #mr-msg {
        width: 100%;
        text-align: center;
        max-width: none;
      }
    }
  `;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.id = "mr-control";
  root.setAttribute("role", "region");
  root.setAttribute("aria-label", "Controles de Meeting Recorder");
  root.innerHTML = `
    <span id="mr-state"><span id="mr-dot"></span><span id="mr-label">Preparando…</span></span>
    <button id="mr-start" type="button">Iniciar grabación</button>
    <button id="mr-finish" type="button">Finalizar reunión y grabación</button>
    <input id="mr-end-time" type="datetime-local" step="60" aria-label="Fecha y hora de finalización">
    <button id="mr-schedule" type="button">Programar fin</button>
    <button id="mr-cancel-schedule" type="button" disabled>Cancelar fin</button>
    <button id="mr-retry-transcription" type="button" hidden>Reintentar transcripción</button>
    <span id="mr-scheduled"></span>
    <span id="mr-msg" aria-live="polite"></span>
  `;
  document.body.appendChild(root);

  const startButton = root.querySelector("#mr-start");
  const finishButton = root.querySelector("#mr-finish");
  const endTimeInput = root.querySelector("#mr-end-time");
  const scheduleButton = root.querySelector("#mr-schedule");
  const cancelScheduleButton = root.querySelector("#mr-cancel-schedule");
  const retryTranscriptionButton = root.querySelector("#mr-retry-transcription");
  const scheduledLabel = root.querySelector("#mr-scheduled");
  const label = root.querySelector("#mr-label");
  const message = root.querySelector("#mr-msg");

  let startedAt = null;
  let lastStatus = null;
  let busy = false;

  const api = (path) => new URL(path, apiBase);

  async function request(path, options = {}) {
    const response = await fetch(api(path), {
      cache: "no-store",
      credentials: "same-origin",
      ...options,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return data;
  }

  function elapsedText() {
    if (!startedAt) return "GRABANDO";
    const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  function toDatetimeLocal(iso) {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function render(status) {
    lastStatus = status;
    const recording = Boolean(status && status.recording);
    const browserRunning = Boolean(status && status.browser_running);
    const scheduled = status?.scheduled_end_at || null;
    const transcription = status?.transcription || {};
    const transcribing = transcription.state === "running";
    const transcriptionError = transcription.state === "error";

    root.classList.toggle("recording", recording);
    root.classList.toggle("transcribing", transcribing && !recording);
    startButton.disabled = busy || recording || transcribing || !status?.audio_ready;
    finishButton.disabled = busy || (!recording && !browserRunning);
    endTimeInput.disabled = busy || !recording;
    scheduleButton.disabled = busy || !recording || !endTimeInput.value;
    cancelScheduleButton.disabled = busy || !scheduled;
    retryTranscriptionButton.hidden = !transcriptionError;
    retryTranscriptionButton.disabled = busy || recording || transcribing;

    if (recording) {
      if (status.started_at) {
        const parsed = Date.parse(status.started_at);
        startedAt = Number.isFinite(parsed) ? parsed : startedAt;
      }
      label.textContent = elapsedText();
    } else if (transcribing) {
      startedAt = null;
      const done = transcription.segments_completed ?? 0;
      const total = transcription.segments_total ?? "?";
      label.textContent = `TRANSCRIBIENDO ${done}/${total}`;
    } else {
      startedAt = null;
      label.textContent = status?.audio_ready ? "LISTO" : "AUDIO…";
    }

    if (scheduled) {
      scheduledLabel.textContent = `Fin: ${new Date(scheduled).toLocaleString()}`;
      scheduledLabel.title = scheduled;
      if (document.activeElement !== endTimeInput) {
        endTimeInput.value = toDatetimeLocal(scheduled);
      }
    } else {
      scheduledLabel.textContent = "";
      scheduledLabel.title = "";
    }

    const warnings = Array.isArray(status?.warnings) ? status.warnings : [];
    if (transcribing) {
      const current = transcription.current_segment || "";
      const stage = transcription.stage || "";
      const waiting = transcription.waiting_seconds || 0;
      if (stage === "waiting_whisper") {
        message.textContent = `Whisper procesando ${current || ""}${waiting ? ` · ${waiting}s` : ""}`;
      } else if (stage === "sending_audio") {
        const sent = transcription.audio_seconds_sent ?? 0;
        const totalAudio = transcription.audio_seconds_total ?? "?";
        message.textContent = `Enviando audio a Whisper: ${sent}/${totalAudio}s`;
      } else if (stage === "connecting") {
        message.textContent = "Conectando con Whisper…";
      } else if (stage === "chunk_completed") {
        message.textContent = "Bloque transcrito; preparando el siguiente…";
      } else {
        message.textContent = current ? `Whisper: ${current}` : "Whisper preparando transcripción…";
      }
      message.title = message.textContent;
    } else if (transcriptionError) {
      message.textContent = `Whisper: ${transcription.error || "error de transcripción"}`;
      message.title = transcription.error || "";
    } else if (transcription.state === "completed") {
      message.textContent = "Transcripción lista";
      message.title = transcription.transcript_path || "";
    } else if (status?.last_error) {
      message.textContent = status.last_error;
      message.title = status.last_error;
    } else if (warnings.includes("virtual_microphone_not_available_at_start")) {
      message.textContent = "Grabando sin micro hasta que aparezca";
      message.title = "El audio remoto se está grabando; el micrófono se añadirá automáticamente cuando Selkies lo publique.";
    } else if (status?.last_completed?.audio_path && !recording) {
      message.textContent = "Audio guardado";
      message.title = status.last_completed.audio_path;
    } else {
      message.textContent = "";
      message.title = "";
    }
  }

  async function refresh() {
    try {
      render(await request("status"));
    } catch (error) {
      label.textContent = "API…";
      message.textContent = error.message;
      message.title = error.message;
      startButton.disabled = true;
      finishButton.disabled = true;
      scheduleButton.disabled = true;
      cancelScheduleButton.disabled = true;
    }
  }

  async function postAction(path) {
    if (busy) return;
    busy = true;
    message.textContent = "";
    if (lastStatus) render(lastStatus);
    try {
      render(await request(path, { method: "POST" }));
    } catch (error) {
      message.textContent = error.message;
      message.title = error.message;
    } finally {
      busy = false;
      await refresh();
    }
  }

  async function setSchedule() {
    if (busy || !endTimeInput.value) return;
    const date = new Date(endTimeInput.value);
    if (Number.isNaN(date.getTime())) {
      message.textContent = "Fecha/hora no válida";
      return;
    }
    busy = true;
    if (lastStatus) render(lastStatus);
    try {
      render(await request("meeting/end-time", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_end_at: date.toISOString() }),
      }));
    } catch (error) {
      message.textContent = error.message;
      message.title = error.message;
    } finally {
      busy = false;
      await refresh();
    }
  }

  async function cancelSchedule() {
    if (busy) return;
    busy = true;
    if (lastStatus) render(lastStatus);
    try {
      render(await request("meeting/end-time", { method: "DELETE" }));
      endTimeInput.value = "";
    } catch (error) {
      message.textContent = error.message;
      message.title = error.message;
    } finally {
      busy = false;
      await refresh();
    }
  }

  startButton.addEventListener("click", () => postAction("recording/start"));
  finishButton.addEventListener("click", () => {
    const ok = window.confirm(
      "Se cerrará Chrome, terminará la reunión y se finalizará la grabación. ¿Continuar?"
    );
    if (ok) postAction("meeting/stop");
  });
  endTimeInput.addEventListener("input", () => {
    scheduleButton.disabled = busy || !lastStatus?.recording || !endTimeInput.value;
  });
  scheduleButton.addEventListener("click", setSchedule);
  cancelScheduleButton.addEventListener("click", cancelSchedule);
  retryTranscriptionButton.addEventListener("click", () => postAction("transcription/retry"));

  setInterval(() => {
    if (lastStatus?.recording) {
      label.textContent = elapsedText();
    }
  }, 1000);
  setInterval(refresh, 3000);
  refresh();
})();
