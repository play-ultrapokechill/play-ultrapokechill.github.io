const MOD_ID = "backupMod";
const STYLE_ID = "backup-mod-style";
const CONFIG_CLASS = "backup-mod-config";
const STORAGE_WEBHOOK = "ultraPokechill.backupMod.webhook";
const STORAGE_LAST_STATUS = "ultraPokechill.backupMod.lastStatus";
const STORAGE_LAST_SENT = "ultraPokechill.backupMod.lastSent";
const BACKUP_INTERVAL_MS = 10 * 60 * 1000;
const TEAM_SLOTS = ["slot1", "slot2", "slot3", "slot4", "slot5", "slot6"];

let autoTimer = 0;
let renderQueued = false;
let observerStarted = false;
let lastStatus = readStorage(STORAGE_LAST_STATUS) || "Webhook not configured.";
let activeApi;

UltraMods.define({
  id: MOD_ID,
  name: "Backup Mod",
  description: "Automatically sends save backups to a Discord webhook every 10 minutes. Check the Backup Mod guide entry before using.",
  version: "1.1",
  author: "UltraPokechill",
  category: "Safety",
  hooks: {
    onToggle(api, payload) {
      activeApi = api;
      installStyles();
      registerGuide(payload.enabled === true);
      if (payload.enabled) startAutoBackups(api);
      else stopAutoBackups();
      queueRenderConfig(api);
    },
    onRefresh(api) {
      activeApi = api;
      installStyles();
      registerGuide(api.isEnabled(MOD_ID));
      if (api.isEnabled(MOD_ID)) startAutoBackups(api);
      else stopAutoBackups();
      queueRenderConfig(api);
    }
  }
});

installStyles();
startMenuObserver();
queueRenderConfig(UltraMods);

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .${CONFIG_CLASS} {
      grid-column: 2 / 4;
      display: grid;
      gap: 0.5rem;
      margin-top: 0.3rem;
      padding: 0.65rem;
      border-top: 1px solid rgba(59, 51, 35, 0.35);
      background: rgba(0, 0, 0, 0.12);
      border-radius: 0.4rem;
    }

    .backup-mod-config-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      color: white;
      font-size: 0.95rem;
      line-height: 1.1rem;
    }

    .backup-mod-config-top span {
      color: var(--light2);
      font-size: 0.8rem;
      opacity: 0.85;
    }

    .backup-mod-webhook-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      gap: 0.35rem;
      align-items: center;
    }

    .backup-mod-webhook {
      min-width: 0;
      width: 100%;
      height: 2.25rem;
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 0.35rem;
      background: var(--dark1);
      color: white;
      padding: 0 0.55rem;
      font-family: inherit;
      font-size: 0.9rem;
    }

    .backup-mod-button {
      min-height: 2.25rem;
      border: 0;
      border-radius: 0.35rem;
      background: var(--dark1);
      color: var(--light2);
      cursor: pointer;
      font-family: inherit;
      font-size: 0.9rem;
      padding: 0.25rem 0.55rem;
      white-space: nowrap;
    }

    .backup-mod-button.primary {
      background: rgb(90, 133, 113);
      color: white;
    }

    .backup-mod-button.warn {
      background: rgb(164, 103, 67);
      color: white;
    }

    .backup-mod-status {
      min-height: 1.8rem;
      display: flex;
      align-items: center;
      padding: 0.35rem 0.45rem;
      border-radius: 0.35rem;
      background: var(--dark1);
      color: var(--light2);
      font-size: 0.82rem;
      line-height: 1.05rem;
      overflow-wrap: anywhere;
    }

    .backup-mod-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    @media (max-width: 650px) {
      .${CONFIG_CLASS} {
        grid-column: 1 / -1;
      }

      .backup-mod-webhook-row {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.appendChild(style);
}

function startMenuObserver() {
  if (observerStarted) return;
  observerStarted = true;

  const observer = new MutationObserver(() => queueRenderConfig(activeApi || UltraMods));
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

function queueRenderConfig(api) {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    renderConfig(api || activeApi || UltraMods);
  });
}

function renderConfig(api) {
  const card = document.querySelector(`.mod-card[data-mod-id="${MOD_ID}"]`);
  if (!card) return;

  let panel = card.querySelector(`.${CONFIG_CLASS}`);
  if (!panel) {
    panel = document.createElement("div");
    panel.className = CONFIG_CLASS;
    card.appendChild(panel);
  }

  const webhook = readWebhook();
  const enabled = api?.isEnabled?.(MOD_ID) === true;
  const lastSent = readStorage(STORAGE_LAST_SENT);
  const status = lastStatus || readStorage(STORAGE_LAST_STATUS) || "Webhook not configured.";
  const signature = `${enabled}:${Boolean(webhook)}:${lastSent || ""}:${status}`;
  if (panel.dataset.signature === signature) return;
  panel.dataset.signature = signature;

  panel.innerHTML = `
    <div class="backup-mod-config-top">
      <strong>Discord backups</strong>
      <span>${enabled ? "Automatic: every 10 minutes" : "Enable the mod to start automatic backups"}</span>
    </div>
    <div class="backup-mod-webhook-row">
      <input class="backup-mod-webhook" id="backup-mod-webhook-input" type="password" autocomplete="off" spellcheck="false" placeholder="Discord webhook URL">
      <button type="button" class="backup-mod-button primary" data-backup-action="save">Save webhook</button>
      <button type="button" class="backup-mod-button warn" data-backup-action="clear">Clear</button>
    </div>
    <div class="backup-mod-actions">
      <button type="button" class="backup-mod-button" data-backup-action="test">Send backup now</button>
      <button type="button" class="backup-mod-button" data-backup-action="guide">Open guide</button>
    </div>
    <div class="backup-mod-status">${escapeHtml(status)}${lastSent ? ` Last sent: ${escapeHtml(formatDateTime(lastSent))}.` : ""}</div>
  `;

  const input = panel.querySelector("#backup-mod-webhook-input");
  if (input) input.value = webhook;

  panel.querySelectorAll("[data-backup-action]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      handleConfigAction(api || activeApi || UltraMods, button.dataset.backupAction, panel);
    });
  });
}

function handleConfigAction(api, action, panel) {
  if (action === "save") {
    const value = panel.querySelector("#backup-mod-webhook-input")?.value || "";
    const cleaned = cleanWebhook(value);
    if (!isValidWebhook(cleaned)) {
      setStatus("Paste a valid Discord webhook URL before saving.");
      queueRenderConfig(api);
      return;
    }

    writeStorage(STORAGE_WEBHOOK, cleaned);
    setStatus("Webhook saved in this browser only. It is not exported with your save.");
    queueRenderConfig(api);
    return;
  }

  if (action === "clear") {
    removeStorage(STORAGE_WEBHOOK);
    removeStorage(STORAGE_LAST_SENT);
    setStatus("Webhook removed from this browser.");
    queueRenderConfig(api);
    return;
  }

  if (action === "test") {
    const typedWebhook = cleanWebhook(panel.querySelector("#backup-mod-webhook-input")?.value || "");
    if (typedWebhook && typedWebhook !== readWebhook()) {
      if (!isValidWebhook(typedWebhook)) {
        setStatus("Paste a valid Discord webhook URL before sending a test backup.");
        queueRenderConfig(api);
        return;
      }
      writeStorage(STORAGE_WEBHOOK, typedWebhook);
    }
    sendBackup(api, "manual");
    return;
  }

  if (action === "guide") {
    openBackupGuide();
  }
}

function startAutoBackups(api) {
  stopAutoBackups();
  activeApi = api;
  autoTimer = window.setInterval(() => {
    if (!api.isEnabled(MOD_ID)) return;
    sendBackup(api, "automatic");
  }, BACKUP_INTERVAL_MS);
}

function stopAutoBackups() {
  if (!autoTimer) return;
  clearInterval(autoTimer);
  autoTimer = 0;
}

async function sendBackup(api, reason) {
  const webhook = readWebhook();
  if (!isValidWebhook(webhook)) {
    setStatus("Backup skipped: configure a Discord webhook in the mod card first.");
    queueRenderConfig(api);
    return false;
  }

  setStatus(reason === "manual" ? "Sending manual backup..." : "Sending automatic backup...");
  queueRenderConfig(api);

  try {
    if (typeof saveGame === "function") saveGame();
    const raw = localStorage.getItem("gameData");
    if (!raw) throw new Error("No save data found.");

    const timestamp = new Date();
    const safeTimestamp = timestamp.toISOString().replace(/[:.]/g, "-");
    const saveFilename = `UltraPokechill-save-${safeTimestamp}.json`;
    const backupFilename = `UltraPokechill-backup-${safeTimestamp}.zip`;
    const zippedSave = createZip(saveFilename, raw);
    const payload = buildDiscordPayload(api, raw, timestamp, reason);
    const form = new FormData();
    form.append("payload_json", JSON.stringify(payload));
    form.append("files[0]", new Blob([zippedSave], { type: "application/zip" }), backupFilename);

    const response = await fetch(webhook, { method: "POST", body: form });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || `Discord returned HTTP ${response.status}`);
    }

    writeStorage(STORAGE_LAST_SENT, timestamp.toISOString());
    setStatus(`Backup sent to Discord (${reason}).`);
    queueRenderConfig(api);
    return true;
  } catch (error) {
    setStatus(`Backup failed: ${error.message || error}`);
    queueRenderConfig(api);
    return false;
  }
}

function buildDiscordPayload(api, raw, timestamp, reason) {
  const logoUrl = absoluteUrl("img/icons/logo.png");
  const teamList = getTeamList(api);
  const caught = getCaughtCount(api);
  const summaryFields = [
    { name: "Reason", value: reason === "manual" ? "Manual backup" : "Automatic backup", inline: true },
    { name: "Save size", value: formatBytes(raw.length), inline: true },
    { name: "Pokemon caught", value: String(caught), inline: true }
  ];

  if (api?.saved?.currentArea) {
    summaryFields.push({ name: "Current area", value: safeText(api.formatName?.(api.saved.currentArea) || api.saved.currentArea), inline: true });
  }

  summaryFields.push({
    name: "Current team",
    value: formatTeamSummary(teamList),
    inline: false
  });

  const embeds = [{
    author: { name: "UltraPokechill Backup", icon_url: logoUrl },
    title: "Save backup ready",
    description: "Download the attached ZIP to keep a copy of your save. Inside it is the normal JSON save file used by the game.",
    color: 0x5a8571,
    thumbnail: { url: logoUrl },
    fields: summaryFields,
    footer: { text: "Backup Mod | webhook stored only in this browser", icon_url: logoUrl },
    timestamp: timestamp.toISOString()
  }];

  for (const member of teamList.slice(0, 6)) {
    embeds.push({
      title: `${member.slot}: ${member.name}`,
      color: member.shiny ? 0xf2d36b : 0x8f8367,
      thumbnail: { url: member.sprite },
      fields: [
        { name: "Level", value: String(member.level), inline: true },
        { name: "HP", value: member.hp, inline: true },
        { name: "Shiny", value: member.shiny ? "Yes" : "No", inline: true }
      ]
    });
  }

  return {
    username: "UltraPokechill",
    avatar_url: logoUrl,
    allowed_mentions: { parse: [] },
    embeds
  };
}

function formatTeamSummary(teamList) {
  if (teamList.length === 0) return "No active team detected.";

  return teamList.slice(0, 6).map(member => {
    const shinyText = member.shiny ? " | Shiny" : "";
    return `${member.slot}: ${member.name} | Lv. ${member.level} | HP ${member.hp}${shinyText}`;
  }).join("\n");
}

function getTeamList(api) {
  const result = [];
  const savedData = api?.saved || {};
  const preview = savedData.previewTeams?.[savedData.currentPreviewTeam] || {};
  const runtime = api?.team || {};
  const pokemon = api?.pkmn || {};

  for (const slot of TEAM_SLOTS) {
    const runtimeId = runtime[slot]?.pkmn?.id;
    const previewId = preview[slot]?.pkmn;
    const id = runtimeId || previewId;
    if (!id || !pokemon[id]) continue;

    const data = pokemon[id];
    const shiny = data.shiny === true && data.shinyDisabled !== true;
    const hp = data.playerHpMax ? `${Math.ceil(data.playerHp || 0)} / ${Math.ceil(data.playerHpMax)}` : "N/A";
    result.push({
      slot: slot.toUpperCase(),
      id,
      name: safeText(api.formatName?.(id) || id),
      level: data.level || 1,
      hp,
      shiny,
      sprite: absoluteUrl(`img/pkmn/${shiny ? "shiny" : "sprite"}/${id}.png`)
    });
  }

  return result;
}

function getCaughtCount(api) {
  const pokemon = api?.pkmn || {};
  let count = 0;
  for (const id in pokemon) {
    if ((Number(pokemon[id]?.caught) || 0) > 0) count++;
  }
  return count;
}

function registerGuide(enabled) {
  if (typeof guide === "undefined") return;

  if (!enabled) {
    if (guide.backupMod) {
      delete guide.backupMod;
      if (typeof setGuide === "function") setGuide();
    }
    return;
  }

  guide.backupMod = {
    name: "Mods: Backup Mod",
    description: function() {
      return `
        Backup Mod can send your current UltraPokechill save to a Discord channel every 10 minutes while the game page is open and the mod is enabled.
        <br><br><strong>How to set it up</strong>
        <br>1. In Discord, open the server settings for a channel where you can manage webhooks.
        <br>2. Create a webhook, copy its URL, then return to UltraPokechill.
        <br>3. Open Settings, Mods, Installed, then paste the webhook into the Backup Mod card and click Save webhook.
        <br>4. Click Send backup now once to confirm Discord receives the file.
        <br><br><strong>What gets sent</strong>
        <br>The mod sends a clean Discord embed with the UltraPokechill logo, basic save details, your current team icons, and a .zip attachment. Inside the ZIP there is a normal .json save file.
        <br><br><strong>Security note</strong>
        <br>The Discord webhook is stored only in this browser's localStorage under the Backup Mod key. It is not stored inside your game save, so exporting or sharing a save will not include the webhook. Anyone with the webhook URL can post to that Discord channel, so do not share it publicly. Clearing this browser's site data will remove the saved webhook.
      `;
    }
  };

  if (typeof setGuide === "function") setGuide();
}

function openBackupGuide() {
  if (typeof guide === "undefined") {
    setStatus("Guide is not available yet. Try again after the game finishes loading.");
    queueRenderConfig(activeApi || UltraMods);
    return;
  }

  registerGuide(true);
  if (typeof setGuide === "function") setGuide();

  const entries = Array.from(document.querySelectorAll("#guide-list .guide-entry"));
  const entry = entries.find(element => element.textContent.trim() === "Mods: Backup Mod");
  if (entry) {
    entry.click();
    return;
  }

  if (typeof openTooltip === "function") {
    document.getElementById("tooltipTop").style.display = "none";
    document.getElementById("tooltipTitle").innerHTML = "Mods: Backup Mod";
    document.getElementById("tooltipMid").style.display = "none";
    document.getElementById("tooltipBottom").innerHTML = `<span style="overflow-y:scroll; max-height:25rem; display:inline-block;">${guide.backupMod.description()}</span>`;
    openTooltip();
  }
}

function readWebhook() {
  return cleanWebhook(readStorage(STORAGE_WEBHOOK) || "");
}

function cleanWebhook(value) {
  return String(value || "").trim();
}

function isValidWebhook(value) {
  return /^https:\/\/(discord(?:app)?\.com)\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+\/?$/.test(cleanWebhook(value));
}

function setStatus(message) {
  lastStatus = String(message || "");
  writeStorage(STORAGE_LAST_STATUS, lastStatus);
}

function readStorage(key) {
  try { return localStorage.getItem(key); } catch (error) { return ""; }
}

function writeStorage(key, value) {
  try { localStorage.setItem(key, String(value)); } catch (error) {}
}

function removeStorage(key) {
  try { localStorage.removeItem(key); } catch (error) {}
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatBytes(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function createZip(fileName, text) {
  const encoder = new TextEncoder();
  const nameBytes = encoder.encode(fileName);
  const dataBytes = encoder.encode(text);
  const crc = crc32(dataBytes);
  const localHeader = new Uint8Array(30 + nameBytes.length);
  const centralHeader = new Uint8Array(46 + nameBytes.length);
  const endRecord = new Uint8Array(22);
  const local = new DataView(localHeader.buffer);
  const central = new DataView(centralHeader.buffer);
  const end = new DataView(endRecord.buffer);

  local.setUint32(0, 0x04034b50, true);
  local.setUint16(4, 20, true);
  local.setUint16(6, 0, true);
  local.setUint16(8, 0, true);
  local.setUint32(14, crc, true);
  local.setUint32(18, dataBytes.length, true);
  local.setUint32(22, dataBytes.length, true);
  local.setUint16(26, nameBytes.length, true);
  localHeader.set(nameBytes, 30);

  const centralOffset = localHeader.length + dataBytes.length;
  central.setUint32(0, 0x02014b50, true);
  central.setUint16(4, 20, true);
  central.setUint16(6, 20, true);
  central.setUint16(8, 0, true);
  central.setUint16(10, 0, true);
  central.setUint32(16, crc, true);
  central.setUint32(20, dataBytes.length, true);
  central.setUint32(24, dataBytes.length, true);
  central.setUint16(28, nameBytes.length, true);
  centralHeader.set(nameBytes, 46);

  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, 1, true);
  end.setUint16(10, 1, true);
  end.setUint32(12, centralHeader.length, true);
  end.setUint32(16, centralOffset, true);

  const zip = new Uint8Array(localHeader.length + dataBytes.length + centralHeader.length + endRecord.length);
  zip.set(localHeader, 0);
  zip.set(dataBytes, localHeader.length);
  zip.set(centralHeader, centralOffset);
  zip.set(endRecord, centralOffset + centralHeader.length);
  return zip;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index++) {
    crc ^= bytes[index];
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function absoluteUrl(path) {
  try {
    if (/^https?:\/\//.test(path)) return path;
    const host = window.location.hostname;
    const localHost = !host || host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
    const base = localHost ? "https://play-ultrapokechill.github.io/" : window.location.href;
    return new URL(path, base).href;
  } catch (error) {
    return path;
  }
}

function safeText(value) {
  return String(value ?? "").replace(/[*_~`|]/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
