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
      background: rgba(20, 20, 24, .92);
      color: #fff;
      font: 600 13px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      box-shadow: 0 4px 24px rgba(0, 0, 0, .35);
      backdrop-filter: blur(8px);
      max-width: calc(100vw - 24px);
    }
    #mr-control button {
      border: 0;
      border-radius: 10px;
      padding: 9px 12px;
      font: inherit;
      cursor: pointer;
      touch-action: manipulation;
    }
    #mr-start { background: #e34ba9; color: #111; }
    #mr-stop { background: #f3f3f3; color: #111; }
    #mr-control button:disabled { opacity: .45; cursor: default; }
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
    #mr-msg {
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #ffb6c7;
      font-weight: 500;
    }
    @media (max-width: 680px) {
      #mr-control {
        top: 8px;
        right: 8px;
        left: 8px;
        justify-content: center;
        flex-wrap: wrap;
      }
      #mr-msg { width: 100%; text-align: center; max-width: none; }
    }
  `;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.id = "mr-control";
  root.setAttribute("role", "region");
  root.setAttribute("aria-label", "Controles de grabación");
  root.innerHTML = `
    <span id="mr-state"><span id="mr-dot"></span><span id="mr-label">Preparando…</span></span>
    <button id="mr-start" type="button">Iniciar grabación</button>
    <button id="mr-stop" type="button" disabled>Detener grabación</button>
    <span id="mr-msg" aria-live="polite"></span>
  `;
  document.body.appendChild(root);

  const startButton = root.querySelector("#mr-start");
  const stopButton = root.querySelector("#mr-stop");
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

  function render(status) {
    lastStatus = status;
    const recording = Boolean(status && status.recording);
    root.classList.toggle("recording", recording);
    startButton.disabled = busy || recording || !status?.audio_ready;
    stopButton.disabled = busy || !recording;

    if (recording) {
      if (status.started_at) {
        const parsed = Date.parse(status.started_at);
        startedAt = Number.isFinite(parsed) ? parsed : startedAt;
      }
      label.textContent = elapsedText();
    } else {
      startedAt = null;
      label.textContent = status?.audio_ready ? "LISTO" : "AUDIO…";
    }

    const warnings = Array.isArray(status?.warnings) ? status.warnings : [];
    if (status?.last_error) {
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
      stopButton.disabled = true;
    }
  }

  async function action(path) {
    if (busy) return;
    busy = true;
    message.textContent = "";
    if (lastStatus) render(lastStatus);
    try {
      const status = await request(path, { method: "POST" });
      render(status);
    } catch (error) {
      message.textContent = error.message;
      message.title = error.message;
    } finally {
      busy = false;
      await refresh();
    }
  }

  startButton.addEventListener("click", () => action("recording/start"));
  stopButton.addEventListener("click", () => action("recording/stop"));

  setInterval(() => {
    if (lastStatus?.recording) {
      label.textContent = elapsedText();
    }
  }, 1000);
  setInterval(refresh, 3000);
  refresh();
})();
