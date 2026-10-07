(() => {
  "use strict";

  if (window.__meetingRecorderControlsLoaded) return;
  window.__meetingRecorderControlsLoaded = true;

  const script =
    document.currentScript ||
    document.querySelector('script[src*="meeting-recorder/controls.js"]');
  if (!script) return;

  const apiBase = new URL("api/", script.src);

  const PLAY_ICON = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5.8v12.4L18.2 12 8 5.8Z"></path>
    </svg>
  `;
  const STOP_ICON = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="1.2"></rect>
    </svg>
  `;

  const style = document.createElement("style");
  style.textContent = `
    #mr-control {
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 10px;
      max-width: calc(100vw - 24px);
      padding: 8px 10px;
      border-radius: 14px;
      background: rgba(20, 20, 24, .94);
      color: #fff;
      box-shadow: 0 4px 24px rgba(0, 0, 0, .35);
      backdrop-filter: blur(8px);
      font: 600 13px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    #mr-control button,
    #mr-control input {
      font: inherit;
      touch-action: manipulation;
    }

    #mr-toggle {
      width: 42px;
      height: 42px;
      display: inline-grid;
      place-items: center;
      flex: 0 0 42px;
      border: 0;
      border-radius: 50%;
      background: #f3f3f3;
      color: #111;
      cursor: pointer;
    }

    #mr-toggle svg {
      width: 22px;
      height: 22px;
      fill: currentColor;
    }

    #mr-control.recording #mr-toggle {
      background: #ff4965;
      color: #111;
    }

    #mr-state {
      min-width: 76px;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    #mr-schedule {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      min-width: 0;
    }

    .mr-field {
      display: grid;
      gap: 3px;
      min-width: 0;
    }

    .mr-field > span {
      color: #cfcfd5;
      font-size: 11px;
      font-weight: 700;
    }

    .mr-field input {
      min-width: 174px;
      border: 0;
      border-radius: 9px;
      padding: 8px 9px;
      background: #fff;
      color: #111;
    }

    .mr-field input:disabled {
      background: #dedee3;
      color: #555;
      opacity: 1;
    }

    #mr-control button:disabled,
    #mr-control input:disabled {
      cursor: default;
    }

    #mr-control button:disabled {
      opacity: .42;
    }

    #mr-msg {
      max-width: 260px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #ffb6c7;
      font-weight: 500;
    }

    @media (max-width: 900px) {
      #mr-control {
        top: 8px;
        right: 8px;
        left: 8px;
        flex-wrap: wrap;
      }

      #mr-schedule {
        order: 3;
        width: 100%;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      }

      .mr-field input {
        width: 100%;
        min-width: 0;
        box-sizing: border-box;
      }

      #mr-msg {
        flex: 1 1 140px;
        max-width: none;
      }
    }

    @media (max-width: 560px) {
      #mr-schedule {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.id = "mr-control";
  root.setAttribute("role", "region");
  root.setAttribute("aria-label", "Controles de Meeting Recorder");
  root.innerHTML = `
    <button id="mr-toggle" type="button" aria-label="Iniciar grabación" title="Iniciar grabación">${PLAY_ICON}</button>
    <span id="mr-state">Preparando…</span>
    <div id="mr-schedule">
      <label class="mr-field">
        <span>Inicio</span>
        <input id="mr-start-time" type="datetime-local" step="60" aria-label="Inicio programado">
      </label>
      <label class="mr-field">
        <span>Fin</span>
        <input id="mr-end-time" type="datetime-local" step="60" aria-label="Fin programado">
      </label>
    </div>
    <span id="mr-msg" aria-live="polite"></span>
  `;
  document.body.appendChild(root);

  const toggleButton = root.querySelector("#mr-toggle");
  const stateLabel = root.querySelector("#mr-state");
  const startTimeInput = root.querySelector("#mr-start-time");
  const endTimeInput = root.querySelector("#mr-end-time");
  const message = root.querySelector("#mr-msg");

  let startedAt = null;
  let lastStatus = null;
  let lastRecording = null;
  let scheduleDirty = false;
  let scheduleError = null;
  let scheduleWrite = Promise.resolve();
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

  function setMessage(text, title = text) {
    message.textContent = text || "";
    message.title = title || "";
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

  function parseInput(input, label) {
    if (!input.value) return null;
    const date = new Date(input.value);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`${label}: fecha/hora no válida`);
    }
    return date;
  }

  function inputScheduleSignature(recording = Boolean(lastStatus?.recording)) {
    return [
      recording ? "" : startTimeInput.value,
      endTimeInput.value,
    ].join("|");
  }

  function readSchedule() {
    const recording = Boolean(lastStatus?.recording);
    const start = recording ? null : parseInput(startTimeInput, "Inicio");
    const end = parseInput(endTimeInput, "Fin");
    const now = Date.now();

    if (start && start.getTime() <= now + 1000) {
      throw new Error("El inicio debe estar en el futuro");
    }
    if (end && end.getTime() <= now + 1000) {
      throw new Error("El fin debe estar en el futuro");
    }
    if (start && end && start.getTime() >= end.getTime()) {
      throw new Error("El fin debe ser posterior al inicio");
    }

    return {
      inputSignature: inputScheduleSignature(recording),
      body: {
        scheduled_start_at: start ? start.toISOString() : null,
        scheduled_end_at: end ? end.toISOString() : null,
      },
    };
  }

  function render(status) {
    lastStatus = status;
    const recording = Boolean(status?.recording);
    const scheduledStart = status?.scheduled_start_at || null;
    const scheduledEnd = status?.scheduled_end_at || null;

    if (lastRecording !== null && lastRecording !== recording) {
      scheduleDirty = false;
      scheduleError = null;
    }
    lastRecording = recording;

    root.classList.toggle("recording", recording);
    toggleButton.innerHTML = recording ? STOP_ICON : PLAY_ICON;
    toggleButton.setAttribute(
      "aria-label",
      recording ? "Finalizar grabación" : "Iniciar grabación"
    );
    toggleButton.title = recording ? "Finalizar grabación" : "Iniciar grabación";
    toggleButton.disabled = busy || (!recording && !status?.audio_ready);

    startTimeInput.disabled = busy || recording;
    endTimeInput.disabled = busy;

    if (recording) {
      if (status.started_at) {
        const parsed = Date.parse(status.started_at);
        startedAt = Number.isFinite(parsed) ? parsed : startedAt;
      }
      stateLabel.textContent = elapsedText();
      startTimeInput.value = toDatetimeLocal(status?.started_at);
    } else {
      startedAt = null;
      stateLabel.textContent = status?.audio_ready ? "LISTO" : "AUDIO…";
      if (!scheduleDirty) {
        startTimeInput.value = toDatetimeLocal(scheduledStart);
      }
    }

    if (!scheduleDirty) {
      endTimeInput.value = toDatetimeLocal(scheduledEnd);
    }

    const warnings = Array.isArray(status?.warnings) ? status.warnings : [];
    if (scheduleError) {
      setMessage(scheduleError);
    } else if (status?.last_error) {
      setMessage(status.last_error);
    } else if (warnings.includes("virtual_microphone_not_available_at_start")) {
      setMessage(
        "Grabando sin micro hasta que aparezca",
        "El audio remoto se está grabando; el micrófono se añadirá automáticamente cuando Selkies lo publique."
      );
    } else if (status?.last_completed?.audio_path && !recording) {
      setMessage("Audio guardado", status.last_completed.audio_path);
    } else {
      setMessage("");
    }
  }

  async function refresh() {
    try {
      render(await request("status"));
    } catch (error) {
      stateLabel.textContent = "API…";
      setMessage(error.message);
      toggleButton.disabled = true;
    }
  }

  function syncSchedule() {
    scheduleDirty = true;

    let snapshot;
    try {
      snapshot = readSchedule();
      scheduleError = null;
    } catch (error) {
      scheduleError = error.message;
      setMessage(scheduleError);
      return;
    }

    scheduleWrite = scheduleWrite
      .catch(() => {})
      .then(async () => {
        const status = await request("recording/schedule", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(snapshot.body),
        });
        if (inputScheduleSignature() === snapshot.inputSignature) {
          scheduleDirty = false;
        }
        render(status);
      })
      .catch((error) => {
        scheduleError = error.message;
        setMessage(scheduleError);
      });
  }

  async function toggleRecording() {
    if (busy || !lastStatus) return;
    const recording = Boolean(lastStatus.recording);

    busy = true;
    setMessage("");
    render(lastStatus);
    try {
      await scheduleWrite.catch(() => {});
      const status = await request(
        recording ? "recording/stop" : "recording/start",
        { method: "POST" }
      );
      scheduleDirty = false;
      render(status);
    } catch (error) {
      setMessage(error.message);
    } finally {
      busy = false;
      await refresh();
    }
  }

  function markScheduleDirty() {
    scheduleDirty = true;
  }

  toggleButton.addEventListener("click", toggleRecording);
  startTimeInput.addEventListener("input", markScheduleDirty);
  endTimeInput.addEventListener("input", markScheduleDirty);
  startTimeInput.addEventListener("change", syncSchedule);
  endTimeInput.addEventListener("change", syncSchedule);

  setInterval(() => {
    if (lastStatus?.recording) {
      stateLabel.textContent = elapsedText();
    }
  }, 1000);
  setInterval(refresh, 3000);
  refresh();
})();
