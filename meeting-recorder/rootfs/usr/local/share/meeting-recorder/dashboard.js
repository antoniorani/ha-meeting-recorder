(() => {
  "use strict";

  // Derive URLs from the script so Home Assistant Ingress prefixes are preserved.
  const script = document.currentScript;
  const apiBase = new URL("api/", script.src);
  const apiUrl = (path) => new URL(path, apiBase);

  const badge = document.querySelector("#recording-badge");
  const label = document.querySelector("#recording-label");
  const duration = document.querySelector("#recording-duration");
  const audio = document.querySelector("#audio-status");
  const scheduledStart = document.querySelector("#scheduled-start");
  const scheduledEnd = document.querySelector("#scheduled-end");
  const statusError = document.querySelector("#status-error");
  const recordingsError = document.querySelector("#recordings-error");
  const recordingsList = document.querySelector("#recordings-list");
  const template = document.querySelector("#recording-template");
  const refreshButton = document.querySelector("#refresh-recordings");

  const dateFormatter = new Intl.DateTimeFormat(navigator.language || "es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const sizeFormatter = new Intl.NumberFormat(navigator.language || "es-ES", {
    maximumFractionDigits: 1,
  });

  let latestStatus = null;
  let statusReceivedAt = 0;
  let loadingRecordings = false;

  function formatDate(value) {
    if (!value) return "Sin programar";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
  }

  function formatDuration(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remaining = total % 60;
    return [hours, minutes, remaining].map((value) => String(value).padStart(2, "0")).join(":");
  }

  function updateDuration() {
    if (!latestStatus?.recording) return;
    const extra = Math.floor((Date.now() - statusReceivedAt) / 1000);
    duration.textContent = formatDuration(latestStatus.elapsed_seconds + extra);
  }

  async function fetchJson(path) {
    const response = await fetch(apiUrl(path), { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    return response.json();
  }

  function renderStatus(status) {
    latestStatus = status;
    statusReceivedAt = Date.now();

    const recording = Boolean(status.recording);
    label.textContent = recording ? "Grabando" : "En espera";
    badge.classList.toggle("is-recording", recording);
    badge.classList.toggle("is-ready", !recording);
    badge.classList.remove("is-unavailable");
    duration.textContent = recording ? formatDuration(status.elapsed_seconds) : "00:00:00";
    audio.textContent = status.audio_ready ? "Disponible" : "No disponible";
    scheduledStart.textContent = formatDate(status.scheduled_start_at);
    scheduledEnd.textContent = formatDate(status.scheduled_end_at);
    statusError.textContent = status.last_error || "";
    statusError.hidden = !status.last_error;
  }

  async function refreshStatus() {
    try {
      renderStatus(await fetchJson("status"));
    } catch {
      latestStatus = null;
      label.textContent = "Sin conexión";
      badge.classList.remove("is-recording", "is-ready");
      badge.classList.add("is-unavailable");
      duration.textContent = "—";
      audio.textContent = "—";
      scheduledStart.textContent = "—";
      scheduledEnd.textContent = "—";
      statusError.textContent = "No se ha podido consultar el estado. Se volverá a intentar automáticamente.";
      statusError.hidden = false;
    }
  }

  function recordingNode(session) {
    const node = template.content.firstElementChild.cloneNode(true);
    const available = session.audio_available === true;

    node.querySelector(".folder-title").textContent = formatDate(session.started_at);
    node.querySelector(".folder-name").textContent = session.id;
    const fileLabel = node.querySelector(".file-label");
    fileLabel.textContent = available ? "MP3 listo" : "Sin MP3";
    fileLabel.classList.toggle("is-pending", !available);

    const download = node.querySelector(".download-link");
    const missing = node.querySelector(".missing-audio");
    const size = node.querySelector(".folder-size");
    if (available) {
      download.href = apiUrl("recordings/" + encodeURIComponent(session.id) + "/audio.mp3").href;
      size.textContent = sizeFormatter.format(session.size_bytes / (1024 * 1024)) + " MiB · audio.mp3";
    } else {
      download.hidden = true;
      missing.hidden = false;
      size.hidden = true;
    }
    return node;
  }

  async function refreshRecordings() {
    if (loadingRecordings) return;
    loadingRecordings = true;
    refreshButton.disabled = true;
    try {
      const payload = await fetchJson("recordings");
      const sessions = Array.isArray(payload.recordings) ? payload.recordings : [];
      const contents = document.createDocumentFragment();
      if (sessions.length) {
        for (const session of sessions) contents.append(recordingNode(session));
      } else {
        const empty = document.createElement("p");
        empty.className = "empty-message";
        empty.textContent = "Todavía no hay grabaciones guardadas.";
        contents.append(empty);
      }
      recordingsList.replaceChildren(contents);
      recordingsError.hidden = true;
      recordingsError.textContent = "";
    } catch {
      recordingsError.textContent = "No se han podido cargar las grabaciones. Inténtalo de nuevo.";
      recordingsError.hidden = false;
    } finally {
      loadingRecordings = false;
      refreshButton.disabled = false;
    }
  }

  refreshButton.addEventListener("click", refreshRecordings);
  refreshStatus();
  refreshRecordings();
  window.setInterval(refreshStatus, 6000);
  window.setInterval(updateDuration, 1000);
  window.setInterval(refreshRecordings, 30000);
})();
