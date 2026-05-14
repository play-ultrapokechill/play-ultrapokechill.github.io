const MOD_ID = "editTeamFightAgain";
const BUTTON_ID = "mod-edit-team-fight-again";
const STYLE_ID = "edit-team-fight-again-style";

const state = {
  observer: undefined,
  returnHandlerInstalled: false,
  previewExitHandlerInstalled: false,
  editingFromBattleEnd: false,
  originalPreviewExitHtml: "",
  originalPreviewExitTitle: "",
  originalReturnTitle: ""
};

UltraMods.define({
  id: MOD_ID,
  name: "Edit Team and Fight Again",
  description: "Adds an end-of-battle button that opens team editing before rematching the same battle.",
  image: "img/items/abilityCapsule.png",
  version: "1.0",
  author: "UltraPokechill",
  category: "Battle",
  hooks: {
    onToggle(api, payload) {
      if (payload.enabled) install();
      else uninstall();
    },
    onRefresh(api) {
      if (api.isEnabled(MOD_ID)) install();
    }
  }
});

function install() {
  installStyles();
  installReturnHandler();
  installPreviewExitHandler();
  ensureEndButton();
  startObserver();
}

function uninstall() {
  document.getElementById(BUTTON_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();

  if (state.observer) {
    state.observer.disconnect();
    state.observer = undefined;
  }

  restorePreviewExit();
  state.editingFromBattleEnd = false;
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${BUTTON_ID} {
      background: rgb(109, 152, 197);
      border-color: rgb(151, 217, 255);
      gap: 0.3rem;
    }

    #${BUTTON_ID}:hover {
      background: rgb(92, 132, 172);
    }

    #${BUTTON_ID} svg {
      flex-shrink: 0;
      margin-right: 0.25rem;
    }

    #${BUTTON_ID} span {
      opacity: 0.82;
      white-space: normal;
    }

    .mod-edit-team-active #preview-team-exit {
      background: rgb(109, 152, 197);
    }
  `;
  document.head.appendChild(style);
}

function startObserver() {
  if (state.observer) return;

  const areaEnd = document.getElementById("area-end");
  if (!areaEnd) return;

  state.observer = new MutationObserver(() => {
    ensureEndButton();
    syncEndButtonVisibility();
  });

  state.observer.observe(areaEnd, {
    attributes: true,
    attributeFilter: ["style", "class"],
    childList: true,
    subtree: true
  });

  const rejoin = document.getElementById("area-rejoin");
  if (rejoin) {
    state.observer.observe(rejoin, {
      attributes: true,
      attributeFilter: ["style", "class"]
    });
  }
}

function ensureEndButton() {
  const areaEnd = document.getElementById("area-end");
  const rejoin = document.getElementById("area-rejoin");
  if (!areaEnd || !rejoin) return;

  let button = document.getElementById(BUTTON_ID);
  if (!button) {
    button = document.createElement("div");
    button.id = BUTTON_ID;
    button.className = "leave-button";
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <path fill="currentColor" d="M7 2h10a2 2 0 0 1 2 2v2h1a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3h-2.18A3 3 0 0 1 14 22H9a3 3 0 0 1-2.82-2H4a3 3 0 0 1-3-3V8a2 2 0 0 1 2-2h1V4a2 2 0 0 1 2-2m0 4h10V4H7zm2 12v1h5v-1zm-4-4h13v-2H5zm3-6v2h2V8zm4 0v2h2V8z"/>
      </svg>
      Edit Team and Fight Again
      <span>Change party, then rematch</span>
    `;
    button.addEventListener("click", openTeamEditorForRematch);
  }

  if (button.parentElement !== areaEnd) rejoin.insertAdjacentElement("afterend", button);
  syncEndButtonVisibility();
}

function syncEndButtonVisibility() {
  const button = document.getElementById(BUTTON_ID);
  const areaEnd = document.getElementById("area-end");
  const rejoin = document.getElementById("area-rejoin");
  if (!button || !areaEnd || !rejoin) return;

  const areaVisible = getComputedStyle(areaEnd).display !== "none";
  const canRejoin = getComputedStyle(rejoin).display !== "none";
  const hasLastArea = Boolean(getLastAreaId());

  button.style.display = areaVisible && canRejoin && hasLastArea ? "flex" : "none";
}

function openTeamEditorForRematch() {
  const areaId = getLastAreaId();
  if (!areaId) {
    showMessageSafe("No previous battle to rematch.");
    return;
  }

  saved.currentArea = undefined;
  saved.currentAreaBuffer = areaId;
  saved.autoRefight = false;
  afkSeconds = 0;
  storedAfkSeconds = 0;

  document.getElementById("area-end").style.display = "none";
  hideMainMenus();

  const teamMenu = document.getElementById("team-menu");
  const previewExit = document.getElementById("preview-team-exit");
  const returnButton = document.getElementById("pkmn-team-return");

  if (!teamMenu || !previewExit) return;

  state.editingFromBattleEnd = true;
  document.body.classList.add("mod-edit-team-active");

  if (!state.originalPreviewExitHtml) state.originalPreviewExitHtml = previewExit.innerHTML;
  if (!state.originalPreviewExitTitle) state.originalPreviewExitTitle = previewExit.title || "";
  if (!state.originalReturnTitle && returnButton) state.originalReturnTitle = returnButton.title || "";

  previewExit.style.display = "flex";
  previewExit.title = "Save this team and fight the same battle again";
  previewExit.innerHTML = `
    Fight Again
    <svg style="margin-left: 1rem; border: 1px solid rgb(151, 252, 255);" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <path fill="currentColor" d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6c0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8m0 14c-3.31 0-6-2.69-6-6c0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4l-4-4z"/>
    </svg>
  `;

  if (returnButton) {
    returnButton.style.display = "flex";
    returnButton.title = "Return to battle rewards";
  }

  teamMenu.style.display = "flex";
  teamMenu.style.zIndex = "220";

  safeCall(() => updatePreviewTeam());
}

function installReturnHandler() {
  if (state.returnHandlerInstalled) return;

  const returnButton = document.getElementById("pkmn-team-return");
  if (!returnButton) return;

  returnButton.addEventListener("click", event => {
    if (!state.editingFromBattleEnd) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    state.editingFromBattleEnd = false;
    restorePreviewExit();

    document.getElementById("team-menu").style.display = "none";
    document.getElementById("area-end").style.display = "flex";
    showMenuForLastArea();
    syncEndButtonVisibility();
  }, true);

  state.returnHandlerInstalled = true;
}

function installPreviewExitHandler() {
  if (state.previewExitHandlerInstalled) return;

  const previewExit = document.getElementById("preview-team-exit");
  if (!previewExit) return;

  previewExit.addEventListener("click", () => {
    if (!state.editingFromBattleEnd) return;

    state.editingFromBattleEnd = false;
    setTimeout(() => {
      restorePreviewExit();
    }, 0);
  }, true);

  state.previewExitHandlerInstalled = true;
}

function restorePreviewExit() {
  const previewExit = document.getElementById("preview-team-exit");
  const returnButton = document.getElementById("pkmn-team-return");

  document.body.classList.remove("mod-edit-team-active");

  if (previewExit && state.originalPreviewExitHtml) {
    previewExit.innerHTML = state.originalPreviewExitHtml;
    previewExit.title = state.originalPreviewExitTitle;
  }

  if (returnButton) returnButton.title = state.originalReturnTitle;
}

function showMenuForLastArea() {
  hideMainMenus();

  const areaId = getLastAreaId();
  const area = typeof areas === "undefined" ? undefined : areas[areaId];
  if (!area) return;

  if (area.id === areas.training?.id) {
    document.getElementById("training-menu").style.display = "flex";
    safeCall(() => setTrainingMenu());
    return;
  }

  if (area.type === "vs" || area.type === "frontier") {
    document.getElementById("vs-menu").style.display = "flex";
    safeCall(() => updateVS());
    if (area.type === "frontier") safeCall(() => updateFrontier());
    return;
  }

  document.getElementById("explore-menu").style.display = "flex";
}

function hideMainMenus() {
  [
    "explore-menu",
    "content-explore",
    "vs-menu",
    "training-menu",
    "settings-menu",
    "guide-menu",
    "genetics-menu",
    "shop-menu",
    "item-menu",
    "pokedex-menu"
  ].forEach(id => {
    const element = document.getElementById(id);
    if (element) element.style.display = "none";
  });
}

function getLastAreaId() {
  if (typeof saved === "undefined" || typeof areas === "undefined") return "";
  const areaId = saved.lastAreaJoined || saved.currentArea;
  return areaId && areas[areaId] ? areaId : "";
}

function showMessageSafe(message) {
  if (typeof showMessage === "function") showMessage(message);
  else console.log(`[Edit Team and Fight Again] ${message}`);
}

function safeCall(callback) {
  try {
    callback();
  } catch (error) {
    console.warn("[Edit Team and Fight Again] action failed", error);
  }
}
