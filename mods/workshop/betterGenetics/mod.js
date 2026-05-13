const MOD_ID = "betterGenetics";
const STYLE_ID = "better-genetics-style";
const PANEL_ID = "better-genetics-tools";
const CONFIG_CLASS = "better-genetics-config";
const PATCH_KEY = "__betterGeneticsSetMenuPatch";
const ROOT_SECONDS = 30 * 60;
const QUICK_SECONDS = 5;

const runtime = {
  api: undefined,
  state: undefined,
  originalSetGeneticMenu: undefined,
  observer: undefined,
  configObserver: undefined,
  renderQueued: false,
  configQueued: false
};

UltraMods.define({
  id: MOD_ID,
  name: "Better Genetics",
  description: "Adds Energy Root quick-use controls and an optional 10-second Quick Genetics mode.",
  image: "mods/workshop/betterGeneticsIcon.png",
  version: "1.0",
  author: "UltraPokechill",
  category: "Genetics",
  hooks: {
    onToggle(api, payload, state) {
      ensureState(state);
      installStyles();
      runtime.api = api;
      runtime.state = state;

      if (payload.enabled) install(api, state);
      else uninstall();

      renderConfig(api);
    },
    onRefresh(api, payload, state) {
      ensureState(state);
      installStyles();
      runtime.api = api;
      runtime.state = state;

      if (api.isEnabled(MOD_ID)) install(api, state);
      renderConfig(api);
    }
  }
});

installStyles();
startConfigObserver(UltraMods);
queueRenderConfig(UltraMods);

function ensureState(state) {
  if (!state || typeof state !== "object") return { quickGenetics: false };
  state.quickGenetics = state.quickGenetics === true;
  return state;
}

function getState(api = runtime.api) {
  const store = api?.saved?.mods?.state;
  if (!store) return ensureState(runtime.state || {});
  if (!store[MOD_ID]) store[MOD_ID] = {};
  runtime.state = ensureState(store[MOD_ID]);
  return runtime.state;
}

function install(api, state) {
  runtime.api = api;
  runtime.state = ensureState(state);
  patchSetGeneticMenu(api);
  startObserver(api);
  renderTools(api);
  renderConfig(api);
  if (runtime.state.quickGenetics) applyQuickGenetics(api);
}

function uninstall() {
  restoreSetGeneticMenu();
  stopObserver();
  document.getElementById(PANEL_ID)?.remove();
}

function patchSetGeneticMenu(api) {
  if (typeof setGeneticMenu !== "function") return;
  if (setGeneticMenu[PATCH_KEY]) return;

  runtime.originalSetGeneticMenu = setGeneticMenu;

  const patched = function betterGeneticsSetGeneticMenu(mode, itemUsed) {
    const result = runtime.originalSetGeneticMenu.apply(this, arguments);
    const state = getState(api);

    if (api.isEnabled(MOD_ID) && state.quickGenetics === true && mode === "start") {
      applyQuickGenetics(api);
    }

    queueRenderTools(api);
    return result;
  };

  patched[PATCH_KEY] = true;
  patched.__betterGeneticsOriginal = runtime.originalSetGeneticMenu;
  setGeneticMenu = patched;
  window.setGeneticMenu = patched;
}

function restoreSetGeneticMenu() {
  if (typeof setGeneticMenu !== "function" || !setGeneticMenu[PATCH_KEY]) return;
  const original = setGeneticMenu.__betterGeneticsOriginal || runtime.originalSetGeneticMenu;
  if (typeof original !== "function") return;
  setGeneticMenu = original;
  window.setGeneticMenu = original;
  runtime.originalSetGeneticMenu = undefined;
}

function startObserver(api) {
  if (runtime.observer) return;
  
  // Use a less aggressive interval instead of observing the entire DOM subtree
  runtime.observer = setInterval(() => queueRenderTools(api), 500);
}

function stopObserver() {
  if (runtime.observer) clearInterval(runtime.observer);
  runtime.observer = undefined;
  runtime.renderQueued = false;
}

function startConfigObserver(api) {
  if (runtime.configObserver) return;
  
  // Checking config menu availability via interval is much cheaper than global DOM mutations
  runtime.configObserver = setInterval(() => queueRenderConfig(api), 500);
}

function queueRenderTools(api) {
  if (runtime.renderQueued) return;
  runtime.renderQueued = true;
  requestAnimationFrame(() => {
    runtime.renderQueued = false;
    renderTools(api);
  });
}

function queueRenderConfig(api) {
  if (runtime.configQueued) return;
  runtime.configQueued = true;
  requestAnimationFrame(() => {
    runtime.configQueued = false;
    renderConfig(api);
  });
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${PANEL_ID} {
      align-items: center;
      background: rgba(39, 35, 28, 0.72);
      border: 0.15rem solid rgba(239, 226, 181, 0.35);
      border-radius: 0.35rem;
      color: var(--light2);
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      justify-content: center;
      margin: 0.5rem auto 0;
      max-width: 36rem;
      padding: 0.45rem;
      width: calc(100% - 1rem);
    }

    .better-genetics-button,
    .better-genetics-config-button {
      background: var(--dark1);
      border: 0;
      border-radius: 0.3rem;
      color: var(--light2);
      cursor: pointer;
      font-family: inherit;
      font-size: 1rem;
      line-height: 1;
      padding: 0.42rem 0.65rem;
    }

    .better-genetics-button:hover,
    .better-genetics-config-button:hover,
    .better-genetics-button:focus-visible,
    .better-genetics-config-button:focus-visible {
      background: rgb(90, 133, 113);
      outline: none;
    }

    .better-genetics-button:disabled {
      cursor: default;
      filter: brightness(0.65);
    }

    .better-genetics-status {
      color: var(--light2);
      font-size: 0.85rem;
      opacity: 0.86;
    }

    .${CONFIG_CLASS} {
      align-items: center;
      border-top: 1px solid rgba(59, 51, 35, 0.35);
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      grid-column: 2 / 4;
      margin-top: 0.15rem;
      padding-top: 0.45rem;
    }

    .better-genetics-config-label {
      color: white;
      font-size: 0.95rem;
    }

    .better-genetics-config-button.active {
      background: rgb(90, 133, 113);
      color: white;
    }

    .better-genetics-config-note {
      color: white;
      font-size: 0.78rem;
      opacity: 0.78;
    }

    @media (max-width: 650px) {
      .${CONFIG_CLASS} {
        grid-column: 1 / -1;
      }

      #${PANEL_ID} {
        align-items: stretch;
        flex-direction: column;
      }
    }
  `;
  document.head.appendChild(style);
}

function renderTools(api = runtime.api) {
  if (!api?.isEnabled?.(MOD_ID)) {
    document.getElementById(PANEL_ID)?.remove();
    return;
  }

  const progress = document.getElementById("genetics-progress");
  const start = document.getElementById("genetics-start");
  if (!progress || !start) return;

  let panel = document.getElementById(PANEL_ID);
  if (!panel) {
    panel = document.createElement("div");
    panel.id = PANEL_ID;
    progress.insertAdjacentElement("afterend", panel);
  }

  if (panel.previousElementSibling !== progress) {
    progress.insertAdjacentElement("afterend", panel);
  }

  const root = readRoot();
  const active = isOperationActive();
  const count = getRootUseCount();
  const quick = getState(api).quickGenetics === true;
  const signature = `${root.owned}:${active}:${count}:${readOperationSeconds()}:${quick}`;
  if (panel.dataset.signature === signature) return;
  panel.dataset.signature = signature;
  panel.innerHTML = "";

  const rootButton = document.createElement("button");
  rootButton.type = "button";
  rootButton.className = "better-genetics-button";
  rootButton.textContent = count > 1 ? `Use Roots x${count}` : "Use Root";
  rootButton.disabled = !active || count <= 0;
  rootButton.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    useRoots(api);
  });
  panel.appendChild(rootButton);

  const status = document.createElement("span");
  status.className = "better-genetics-status";
  status.textContent = active
    ? `Energy Root: x${root.owned} | Remaining: ${formatTime(readOperationSeconds())}`
    : `Energy Root: x${root.owned} | Start an operation to use Roots`;
  panel.appendChild(status);
}

function renderConfig(api = runtime.api) {
  const card = document.querySelector(`.mod-card[data-mod-id="${MOD_ID}"]`);
  if (!card) return;

  const state = getState(api);
  const enabled = api?.isEnabled?.(MOD_ID) === true;
  let panel = card.querySelector(`.${CONFIG_CLASS}`);

  if (!panel) {
    panel = document.createElement("div");
    panel.className = CONFIG_CLASS;
    card.appendChild(panel);
  }

  const signature = `${enabled}:${state.quickGenetics}`;
  if (panel.dataset.signature === signature) return;
  panel.dataset.signature = signature;
  panel.innerHTML = "";

  const label = document.createElement("span");
  label.className = "better-genetics-config-label";
  label.textContent = "Quick Genetics";
  panel.appendChild(label);

  const button = document.createElement("button");
  button.type = "button";
  button.className = state.quickGenetics ? "better-genetics-config-button active" : "better-genetics-config-button";
  button.textContent = state.quickGenetics ? "On" : "Off";
  button.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    state.quickGenetics = state.quickGenetics !== true;
    if (api?.isEnabled?.(MOD_ID) && state.quickGenetics) applyQuickGenetics(api);
    api?.save?.();
    renderConfig(api);
    renderTools(api);
  });
  panel.appendChild(button);

  const note = document.createElement("span");
  note.className = "better-genetics-config-note";
  note.textContent = enabled
    ? "New operations finish in 10 seconds when enabled."
    : "Enable the mod to use Genetics shortcuts.";
  panel.appendChild(note);
}

function useRoots(api = runtime.api) {
  const root = readRoot();
  const count = getRootUseCount();
  if (!isOperationActive() || count <= 0 || root.owned <= 0) return;

  root.item.got = Math.max(0, root.owned - count);
  saved.geneticOperation = Math.max(1, readOperationSeconds() - count * ROOT_SECONDS);
  if (!Number.isFinite(Number(saved.geneticOperationTotal))) {
    saved.geneticOperationTotal = Math.max(saved.geneticOperation, 1);
  }

  safeCall(() => { if (typeof updateItemBag === "function") updateItemBag(); });
  safeCall(() => { if (typeof setGeneticMenu === "function") setGeneticMenu(); });
  safeCall(() => { if (typeof saveGame === "function") saveGame(); });
  api?.persistMods?.();
  renderTools(api);
}

function applyQuickGenetics(api = runtime.api) {
  if (!isOperationActive()) return false;
  if (readOperationSeconds() <= QUICK_SECONDS) return false;

  saved.geneticOperation = QUICK_SECONDS;
  saved.geneticOperationTotal = QUICK_SECONDS;
  updateProgressUi();
  safeCall(() => { if (typeof saveGame === "function") saveGame(); });
  api?.persistMods?.();
  return true;
}

function readRoot() {
  const root = typeof item === "undefined" ? undefined : item.energyRoot;
  return {
    item: root,
    owned: Math.max(0, Math.floor(Number(root?.got) || 0))
  };
}

function getRootUseCount() {
  const root = readRoot();
  if (!isOperationActive()) return 0;

  const remaining = Math.max(0, readOperationSeconds() - 1);
  return Math.min(root.owned, Math.ceil(remaining / ROOT_SECONDS));
}

function isOperationActive() {
  return typeof saved !== "undefined" && Number(saved.geneticOperation) > 1;
}

function readOperationSeconds() {
  if (typeof saved === "undefined") return 0;
  return Math.max(0, Math.ceil(Number(saved.geneticOperation) || 0));
}

function updateProgressUi() {
  const total = Math.max(1, Number(saved?.geneticOperationTotal) || QUICK_SECONDS);
  const remaining = readOperationSeconds();
  const time = document.getElementById("genetics-progress-time");
  const bar = document.getElementById("genetics-progress-bar");
  if (time) time.textContent = formatTime(remaining);
  if (bar) bar.style.width = `${100 - (remaining / total) * 100}%`;
}

function formatTime(seconds) {
  const value = Math.max(0, Math.ceil(Number(seconds) || 0));
  if (typeof returnHMS === "function") return returnHMS(value);
  const h = Math.floor(value / 3600);
  const m = Math.floor((value % 3600) / 60);
  const s = value % 60;
  return `${h}h ${m}m ${s}s`;
}

function safeCall(callback) {
  try {
    callback();
  } catch (error) {
    console.warn("[Better Genetics] action failed", error);
  }
}
