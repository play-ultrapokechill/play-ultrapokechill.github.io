const MOD_ID = "movePresets";
const STYLE_ID = "move-presets-style";
const EDITOR_PANEL_ID = "move-presets-editor-panel";
const PATCH_KEY = "__ultraMovePresetsPatch";
const SLOTS = ["slot1", "slot2", "slot3", "slot4"];

const runtime = {
  api: undefined,
  state: undefined,
  observer: undefined,
  moveSwitcher: undefined,
  rendering: false
};

const ICONS = {
  add: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M11 5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6z"/></svg>',
  edit: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m2.777 19.783l.607-4.162c.037-.272.161-.525.355-.72L15.5 3.124a1.26 1.26 0 0 1 1.19-.341a6.2 6.2 0 0 1 2.832 1.694a6.2 6.2 0 0 1 1.682 2.846a1.26 1.26 0 0 1-.341 1.19L9.089 20.275a1.26 1.26 0 0 1-.721.354l-4.161.607a1.264 1.264 0 0 1-1.43-1.454M13.275 5.364l5.363 5.363"/></svg>',
  update: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M5 3h12l2 2v16H5zm2 2v6h9V5zm10 14v-6H7v6zM8 6h6v4H8z"/></svg>',
  delete: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M7 21q-.825 0-1.412-.587T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.587 1.413T17 21zm2-4h2V8H9zm4 0h2V8h-2z"/></svg>'
};

UltraMods.define({
  id: MOD_ID,
  name: "Move Presets",
  description: "Saves multiple move sets per Pokemon and remembers selected sets on team presets.",
  image: "img/items/tmNormal.png",
  version: "1.6",
  author: "UltraPokechill",
  category: "Pokemon UI",
  hooks: {
    onToggle(api, payload, state) {
      if (payload.enabled) install(api, state);
      else uninstall();
    },
    onRefresh(api, payload, state) {
      if (api.isEnabled(MOD_ID)) install(api, state);
    }
  }
});

function install(api, state) {
  runtime.api = api;
  runtime.state = ensureState(state);
  installStyles();
  patchTeamFunctions();
  installBattleMoveSwitcher();
  startObserver();
  renderAll();
}

function uninstall() {
  runtime.observer?.disconnect();
  runtime.observer = undefined;
  removeBattleMoveSwitcher();
  restoreTeamFunctions();
  document.getElementById(EDITOR_PANEL_ID)?.remove();
  document.querySelectorAll(".move-presets-team-row").forEach(element => element.remove());
  document.querySelectorAll(".move-presets-level-control").forEach(element => element.remove());
  document.getElementById(STYLE_ID)?.remove();
}

function ensureState(state) {
  if (!state || typeof state !== "object") state = {};
  if (!state.presets || typeof state.presets !== "object") state.presets = {};
  if (!state.activeByPokemon || typeof state.activeByPokemon !== "object") state.activeByPokemon = {};
  if (!state.teamSelections || typeof state.teamSelections !== "object") state.teamSelections = {};
  return state;
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${EDITOR_PANEL_ID} {
      align-items: center;
      color: var(--light1);
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      justify-content: center;
      padding: 0;
      width: 95%;
    }

    #${EDITOR_PANEL_ID} .move-presets-selector-bar {
      align-items: center;
      background: var(--dark2);
      border-radius: 0.3rem;
      box-sizing: border-box;
      display: flex;
      gap: 0.5rem;
      height: 2.5rem;
      justify-content: center;
      padding: 0.5rem;
      position: relative;
      width: 100%;
    }

    #${EDITOR_PANEL_ID} .move-presets-select {
      background: var(--dark2);
      border: none;
      border-radius: 10rem;
      color: rgb(190, 211, 224);
      cursor: pointer;
      font-family: inherit;
      font-size: 1.2rem;
      height: 100%;
      margin: 0 auto;
      min-width: 0;
      text-align: center;
      width: min(20rem, calc(100% - 10rem));
    }

    #${EDITOR_PANEL_ID} .move-presets-icon-button {
      align-items: center;
      appearance: none;
      background: var(--light2);
      border: none;
      border-radius: 0.3rem;
      color: var(--light1);
      cursor: pointer;
      display: flex;
      flex-shrink: 0;
      height: 1.8rem;
      justify-content: center;
      padding: 0.2rem;
      width: 1.8rem;
    }

    #${EDITOR_PANEL_ID} .move-presets-icon-button svg {
      height: 100%;
      width: 100%;
    }

    #${EDITOR_PANEL_ID} .move-presets-icon-button:disabled {
      cursor: default;
      filter: brightness(0.65);
      opacity: 0.55;
    }

    #${EDITOR_PANEL_ID} .move-presets-icon-button:not(:disabled):hover,
    #${EDITOR_PANEL_ID} .move-presets-icon-button:not(:disabled):focus-visible,
    .move-presets-level-control select:not(:disabled):hover,
    .move-presets-level-control select:not(:disabled):focus-visible {
      filter: brightness(1.16);
      outline: none;
    }

    .move-presets-status {
      color: var(--dark2);
      font-size: 0.8rem;
      line-height: 1rem;
      min-height: 1rem;
      min-width: 7rem;
      text-align: center;
      width: 100%;
    }

    .move-presets-level-control {
      align-items: center;
      color: var(--light2);
      display: inline-flex;
      font-size: 0.78rem;
      gap: 0.2rem;
      line-height: 1;
      margin-left: 0.4rem;
      max-width: min(9.5rem, 45%);
      position: relative;
      vertical-align: middle;
      white-space: nowrap;
      z-index: 4;
    }

    .move-presets-level-control span {
      color: var(--light2);
      opacity: 0.9;
      flex-shrink: 0;
      white-space: nowrap;
    }

    .move-presets-level-control select {
      background: var(--dark1);
      border: 1px solid var(--dark2);
      border-radius: 0.2rem;
      color: var(--light2);
      cursor: pointer;
      font-family: inherit;
      font-size: 0.78rem;
      height: 1.25rem;
      max-width: 6.6rem;
      min-width: 0;
      padding: 0 0.15rem;
      width: 100%;
    }

    .move-presets-level-control select:disabled {
      cursor: default;
      filter: brightness(0.75);
      opacity: 0.7;
    }

    .move-presets-level-control[data-battle-locked="true"] {
      opacity: 0.7;
    }

    @media (max-width: 700px) {
      #${EDITOR_PANEL_ID} .move-presets-selector-bar {
        flex-wrap: wrap;
        height: auto;
      }

      #${EDITOR_PANEL_ID} .move-presets-select {
        flex: 1 1 100%;
        height: 1.8rem;
        width: 100%;
      }

      .move-presets-level-control {
        max-width: min(8rem, 42%);
      }
    }
  `;
  document.head.appendChild(style);
}

function startObserver() {
  if (runtime.observer) return;

  runtime.observer = new MutationObserver(() => {
    if (runtime.rendering) return;
    queueRenderAll();
  });

  runtime.observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["style", "class"],
    childList: true,
    subtree: true
  });
}

function queueRenderAll() {
  if (runtime.rendering) return;
  runtime.rendering = true;
  requestAnimationFrame(() => {
    renderAll();
    runtime.rendering = false;
  });
}

function renderAll() {
  renderEditorPanel();
  renderTeamRows();
}

function patchTeamFunctions() {
  const existing = window[PATCH_KEY];
  if (existing?.installed) return;

  const patch = {
    installed: true,
    updatePreviewTeam: window.updatePreviewTeam,
    injectPreviewTeam: window.injectPreviewTeam,
    swapTeamSlots: window.swapTeamSlots
  };

  if (typeof patch.updatePreviewTeam === "function") {
    patch.updatePreviewTeamPatched = function patchedMovePresetsUpdatePreviewTeam(...args) {
      preparePreviewTeamForRender();
      const result = patch.updatePreviewTeam.apply(this, args);
      queueRenderAll();
      return result;
    };
    window.updatePreviewTeam = patch.updatePreviewTeamPatched;
  }

  if (typeof patch.injectPreviewTeam === "function") {
    patch.injectPreviewTeamPatched = function patchedMovePresetsInjectPreviewTeam(...args) {
      applyCurrentTeamSelections();
      return patch.injectPreviewTeam.apply(this, args);
    };
    window.injectPreviewTeam = patch.injectPreviewTeamPatched;
  }

  if (typeof patch.swapTeamSlots === "function") {
    patch.swapTeamSlotsPatched = function patchedMovePresetsSwapTeamSlots(slotA, slotB, ...args) {
      swapTeamSelections(slotA, slotB);
      return patch.swapTeamSlots.call(this, slotA, slotB, ...args);
    };
    window.swapTeamSlots = patch.swapTeamSlotsPatched;
  }

  window[PATCH_KEY] = patch;
}

function restoreTeamFunctions() {
  const patch = window[PATCH_KEY];
  if (!patch?.installed) return;

  if (patch.updatePreviewTeam && window.updatePreviewTeam === patch.updatePreviewTeamPatched) {
    window.updatePreviewTeam = patch.updatePreviewTeam;
  }
  if (patch.injectPreviewTeam && window.injectPreviewTeam === patch.injectPreviewTeamPatched) {
    window.injectPreviewTeam = patch.injectPreviewTeam;
  }
  if (patch.swapTeamSlots && window.swapTeamSlots === patch.swapTeamSlotsPatched) {
    window.swapTeamSlots = patch.swapTeamSlots;
  }

  patch.installed = false;
}

function installBattleMoveSwitcher() {
  if (runtime.moveSwitcher) return;

  runtime.moveSwitcher = event => {
    if (!isBattleLocked()) return;
    const moveBox = event.target?.closest?.("#pkmn-editor-movepool .pkmn-movebox");
    if (!moveBox) return;

    const pokemonId = getCurrentEditedPokemonId();
    const pokemon = runtime.api?.pkmn?.[pokemonId];
    const slot = getMoveSlotReplace();
    const moveId = moveBox.dataset.move;
    if (!pokemon || !SLOTS.includes(slot) || !moveId) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (Object.values(pokemon.moves || {}).includes(moveId)) {
      clearHighlightedMoveSelection();
      return;
    }

    const nextMoves = readCurrentMoves(pokemon);
    nextMoves[slot] = moveId;
    if (!presetMovesAreAvailable(pokemon, nextMoves)) {
      setEditorStatus("Missing move");
      return;
    }

    pokemon.moves = { ...(pokemon.moves || {}), [slot]: moveId };
    clearHighlightedMoveSelection();
    clearDivergedTeamSelectionsForPokemon(pokemonId);
    runtime.api.save();
    refreshPokemonViews(pokemonId);
    setEditorStatus("Changed");
  };

  document.addEventListener("click", runtime.moveSwitcher, true);
}

function removeBattleMoveSwitcher() {
  if (!runtime.moveSwitcher) return;
  document.removeEventListener("click", runtime.moveSwitcher, true);
  runtime.moveSwitcher = undefined;
}

function getMoveSlotReplace() {
  try {
    return typeof moveSlotReplace === "undefined" ? undefined : moveSlotReplace;
  } catch (error) {
    return undefined;
  }
}

function clearHighlightedMoveSelection() {
  try {
    if (typeof moveSlotReplace !== "undefined") moveSlotReplace = undefined;
  } catch (error) {}

  document.querySelectorAll(".highlighted-move").forEach(element => element.classList.remove("highlighted-move"));
}

function renderEditorPanel() {
  const title = document.querySelector(".pkmn-editor-move-title");
  const movesContainer = document.getElementById("pkmn-editor-current-moves");
  const editor = document.getElementById("pkmn-editor");
  const pokemonId = getCurrentEditedPokemonId();

  if (!title || !movesContainer || !editor || getComputedStyle(editor).display === "none" || !pokemonId) {
    document.getElementById(EDITOR_PANEL_ID)?.remove();
    return;
  }

  const pokemon = runtime.api.pkmn?.[pokemonId];
  if (!pokemon) return;

  let panel = document.getElementById(EDITOR_PANEL_ID);
  if (!panel) {
    panel = document.createElement("div");
    panel.id = EDITOR_PANEL_ID;
    title.insertAdjacentElement("afterend", panel);
  }

  const presets = getPokemonPresets(pokemonId);
  const activeId = getActivePresetId(pokemonId);
  const signature = `${pokemonId}:${activeId}:${presets.map(preset => `${preset.id}:${preset.name}:${movesSignature(preset.moves)}`).join("|")}:${movesSignature(readCurrentMoves(pokemon))}`;
  if (panel.dataset.signature === signature) return;
  panel.dataset.signature = signature;
  panel.innerHTML = "";

  const selectorBar = document.createElement("div");
  selectorBar.className = "move-presets-selector-bar";

  const select = document.createElement("select");
  select.className = "move-presets-select";
  select.disabled = presets.length === 0;

  if (presets.length === 0) {
    select.appendChild(new Option("No presets", ""));
  } else {
    presets.forEach((preset, index) => {
      const option = new Option(preset.name || `Set ${index + 1}`, preset.id);
      select.appendChild(option);
    });
    select.value = activeId || presets[0].id;
  }
  select.addEventListener("change", event => {
    const preset = getPresetById(pokemonId, event.target.value);
    if (!preset) return;
    if (!applyPresetToPokemon(pokemonId, preset, true)) {
      event.target.value = getActivePresetId(pokemonId);
      return;
    }

    runtime.state.activeByPokemon[pokemonId] = preset.id;
    rememberOpenTeamSlotsForPokemon(pokemonId, preset.id);
    runtime.api.save();
    refreshPokemonViews(pokemonId);
    renderAll();
    setEditorStatus("Selected");
  });

  const saveNew = makeIconButton("Save New", ICONS.add, () => {
    const preset = saveNewPreset(pokemonId);
    runtime.state.activeByPokemon[pokemonId] = preset.id;
    rememberOpenTeamSlotsForPokemon(pokemonId, preset.id);
    runtime.api.save();
    renderAll();
    setEditorStatus("Saved");
    schedulePresetNameEditor(pokemonId, preset.id);
  });

  const rename = makeIconButton("Rename", ICONS.edit, () => {
    schedulePresetNameEditor(pokemonId);
  });
  rename.disabled = presets.length === 0;

  const update = makeIconButton("Save", ICONS.update, () => {
    let preset = getSelectedPreset(pokemonId);
    let created = false;

    if (!preset) {
      preset = saveNewPreset(pokemonId);
      created = true;
    } else {
      preset.moves = readCurrentMoves(pokemon);
      preset.updatedAt = Date.now();
    }

    runtime.state.activeByPokemon[pokemonId] = preset.id;
    rememberOpenTeamSlotsForPokemon(pokemonId, preset.id);
    runtime.api.save();
    renderAll();
    setEditorStatus(created ? "Saved" : "Updated");
    if (created) schedulePresetNameEditor(pokemonId, preset.id);
  });

  const remove = makeIconButton("Delete", ICONS.delete, () => {
    const preset = getSelectedPreset(pokemonId);
    if (!preset) return;
    removePreset(pokemonId, preset.id);
    runtime.api.save();
    renderAll();
    setEditorStatus("Deleted");
  });
  remove.disabled = presets.length === 0;

  const status = document.createElement("span");
  status.className = "move-presets-status";
  status.textContent = "";

  selectorBar.append(select, saveNew, rename, update, remove);
  panel.append(selectorBar, status);
}

function renderTeamRows() {
  const preview = document.getElementById("team-preview");
  if (!preview || !runtime.state) return;

  const currentTeam = getCurrentPreviewTeam();
  if (!currentTeam) return;

  document.querySelectorAll(".move-presets-team-row").forEach(element => element.remove());
  const activeSlots = new Set();

  for (const slot in currentTeam) {
    if (slot === "name") continue;
    const pokemonId = currentTeam[slot]?.pkmn;
    const levelLabel = document.getElementById(`explore-${slot}-lvl`);
    activeSlots.add(slot);

    if (!pokemonId || !levelLabel) {
      document.getElementById(`move-presets-${slot}-level-control`)?.remove();
      continue;
    }

    const card = document.getElementById(`explore-${slot}-member`);
    const presets = getPokemonPresets(pokemonId);
    if (presets.length === 0) {
      document.getElementById(`move-presets-${slot}-level-control`)?.remove();
      continue;
    }

    let selected = getTeamSelection(slot);
    if (selected && !getPresetById(pokemonId, selected)) {
      clearTeamSelection(slot);
      selected = "";
    }

    let control = document.getElementById(`move-presets-${slot}-level-control`);
    if (!control) {
      control = document.createElement("span");
      control.id = `move-presets-${slot}-level-control`;
      control.className = "move-presets-level-control";
      control.addEventListener("click", event => event.stopPropagation());
      control.addEventListener("mousedown", event => event.stopPropagation());
      control.addEventListener("touchstart", event => event.stopPropagation(), { passive: true });
    }

    placeLevelControl(control, slot, levelLabel);

    const label = document.createElement("span");
    label.textContent = "Move:";

    const select = document.createElement("select");
    select.appendChild(new Option("Current", ""));
    presets.forEach((preset, index) => {
      select.appendChild(new Option(preset.name || `Set ${index + 1}`, preset.id));
    });
    select.value = selected || "";
    delete control.dataset.battleLocked;
    select.removeAttribute("title");

    const signature = `${pokemonId}:${selected}:${presets.map(preset => preset.id + preset.name).join("|")}`;
    if (control.dataset.signature === signature) {
      placeLevelControl(control, slot, levelLabel);
      continue;
    }
    control.dataset.signature = signature;
    control.innerHTML = "";

    select.addEventListener("change", event => {
      event.stopPropagation();
      const presetId = event.target.value;
      if (!presetId) {
        clearTeamSelection(slot);
        runtime.api.save();
        renderAll();
        return;
      }

      const preset = getPresetById(pokemonId, presetId);
      if (!preset || !applyPresetToPokemon(pokemonId, preset, false)) return;
      setTeamSelection(slot, presetId);
      runtime.state.activeByPokemon[pokemonId] = presetId;
      runtime.api.save();
      refreshPokemonViews(pokemonId);
      renderAll();
    });

    control.append(label, select);
  }

  document.querySelectorAll(".move-presets-level-control").forEach(element => {
    const slot = element.id.replace(/^move-presets-(slot\d+)-level-control$/, "$1");
    if (!activeSlots.has(slot)) element.remove();
  });
}

function placeLevelControl(control, slot, levelLabel) {
  const hpReadout = document.getElementById(`mod-${slot}-hp-readout`);
  const anchor = hpReadout && hpReadout.parentElement === levelLabel.parentElement ? hpReadout : levelLabel;
  if (control.parentElement !== anchor.parentElement || control.previousElementSibling !== anchor) {
    anchor.insertAdjacentElement("afterend", control);
  }
}

function makeIconButton(label, icon, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "move-presets-icon-button";
  button.title = label;
  button.setAttribute("aria-label", label);
  button.innerHTML = icon;
  button.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return button;
}

function saveNewPreset(pokemonId) {
  const pokemon = runtime.api.pkmn?.[pokemonId];
  const presets = getPokemonPresets(pokemonId);
  const preset = {
    id: `set${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: `Set ${presets.length + 1}`,
    moves: readCurrentMoves(pokemon),
    updatedAt: Date.now()
  };
  presets.push(preset);
  return preset;
}

function schedulePresetNameEditor(pokemonId, presetId) {
  setTimeout(() => openPresetNameEditor(pokemonId, presetId), 180);
}

function openPresetNameEditor(pokemonId, presetId) {
  const preset = presetId ? getPresetById(pokemonId, presetId) : getSelectedPreset(pokemonId);
  if (!preset) {
    setEditorStatus("No preset");
    return;
  }

  const saveName = value => {
    preset.name = cleanPresetName(value, preset.name || getFallbackPresetName(pokemonId, preset.id));
    preset.updatedAt = Date.now();
    runtime.state.activeByPokemon[pokemonId] = preset.id;
    runtime.api.save();
    renderAll();
    setEditorStatus("Renamed");
  };

  const tooltipMid = document.getElementById("tooltipMid");
  const tooltipBottom = document.getElementById("tooltipBottom");
  const tooltipTitle = document.getElementById("tooltipTitle");

  if (tooltipMid && tooltipBottom && tooltipTitle && typeof openTooltip === "function") {
    const tooltipTop = document.getElementById("tooltipTop");
    if (tooltipTop) tooltipTop.style.display = "none";
    tooltipTitle.style.display = "inline";
    tooltipMid.style.display = "inline";
    tooltipBottom.style.display = "inline";
    tooltipTitle.innerHTML = "Edit move preset name";
    tooltipMid.innerHTML = "";
    tooltipBottom.innerHTML = '<span id="prevent-tooltip-exit"></span>';

    const input = document.createElement("input");
    input.id = "move-preset-name-field";
    input.type = "text";
    input.maxLength = 24;
    input.placeholder = preset.name || getFallbackPresetName(pokemonId, preset.id);
    input.value = preset.name || "";
    input.style.width = "100%";

    const saveButton = document.createElement("div");
    saveButton.className = "auto-build-confirm";
    saveButton.textContent = "Save";
    saveButton.style.cursor = "pointer";
    saveButton.style.display = "flex";
    saveButton.style.justifyContent = "center";
    saveButton.style.alignItems = "center";
    saveButton.style.padding = "0.4rem";

    const submit = () => {
      saveName(input.value);
      if (typeof closeTooltip === "function") closeTooltip();
    };

    input.addEventListener("keydown", event => {
      if (event.key === "Enter") submit();
    });
    saveButton.addEventListener("click", submit);

    tooltipMid.appendChild(input);
    tooltipBottom.appendChild(saveButton);
    openTooltip();
    setTimeout(() => input.focus(), 50);
    return;
  }

  const nextName = window.prompt("Move preset name", preset.name || "");
  if (nextName !== null) saveName(nextName);
}

function cleanPresetName(name, fallback) {
  const value = String(name || "").trim().slice(0, 24);
  return value || fallback || "Set";
}

function getFallbackPresetName(pokemonId, presetId) {
  const index = getPokemonPresets(pokemonId).findIndex(preset => preset.id === presetId);
  return `Set ${Math.max(index + 1, 1)}`;
}

function removePreset(pokemonId, presetId) {
  runtime.state.presets[pokemonId] = getPokemonPresets(pokemonId).filter(preset => preset.id !== presetId);
  if (runtime.state.activeByPokemon[pokemonId] === presetId) delete runtime.state.activeByPokemon[pokemonId];

  for (const teamId in runtime.state.teamSelections) {
    for (const slot in runtime.state.teamSelections[teamId]) {
      if (runtime.state.teamSelections[teamId][slot] === presetId) delete runtime.state.teamSelections[teamId][slot];
    }
  }
}

function getPokemonPresets(pokemonId) {
  if (!runtime.state.presets[pokemonId]) runtime.state.presets[pokemonId] = [];
  return runtime.state.presets[pokemonId];
}

function getSelectedPreset(pokemonId) {
  const activeId = getActivePresetId(pokemonId);
  return getPresetById(pokemonId, activeId);
}

function getPresetById(pokemonId, presetId) {
  if (!presetId) return undefined;
  return getPokemonPresets(pokemonId).find(preset => preset.id === presetId);
}

function getActivePresetId(pokemonId) {
  const activeId = runtime.state.activeByPokemon[pokemonId];
  if (getPresetById(pokemonId, activeId)) return activeId;
  const firstPreset = getPokemonPresets(pokemonId)[0];
  return firstPreset?.id || "";
}

function readCurrentMoves(pokemon) {
  const moves = {};
  for (const slot of SLOTS) moves[slot] = pokemon?.moves?.[slot] || undefined;
  return moves;
}

function applyPresetToPokemon(pokemonId, preset, showStatus) {
  const pokemon = runtime.api.pkmn?.[pokemonId];
  if (!pokemon || !preset?.moves) return false;

  if (!canSwitchMovesNow(pokemon, preset.moves)) {
    if (showStatus) setEditorStatus("Restricted");
    return false;
  }

  if (!presetMovesAreAvailable(pokemon, preset.moves)) {
    if (showStatus) setEditorStatus("Missing move");
    return false;
  }

  const nextMoves = {};
  const seen = new Set();
  for (const slot of SLOTS) {
    const moveId = preset.moves[slot];
    if (!moveId || seen.has(moveId)) {
      nextMoves[slot] = undefined;
      continue;
    }
    nextMoves[slot] = moveId;
    seen.add(moveId);
  }

  pokemon.moves = { slot1: undefined, slot2: undefined, slot3: undefined, slot4: undefined };
  for (const slot of SLOTS) pokemon.moves[slot] = nextMoves[slot];
  return true;
}

function presetMovesAreAvailable(pokemon, moves) {
  const available = new Set([...(pokemon.movepool || []), ...Object.values(pokemon.moves || {})].filter(Boolean));
  if (pokemon.signature?.id) available.add(pokemon.signature.id);
  if (pokemon.eggMove?.id) available.add(pokemon.eggMove.id);

  return SLOTS.every(slot => {
    const moveId = moves[slot];
    return !moveId || (runtime.api.move?.[moveId] && available.has(moveId));
  });
}

function canSwitchMovesNow(pokemon, moves) {
  return true;
}

function isBattleLocked() {
  return runtime.api?.saved?.currentArea !== undefined;
}

function preparePreviewTeamForRender() {
  if (isBattleLocked()) return;

  if (!isPokemonEditorOpen()) {
    applyCurrentTeamSelections();
    return;
  }

  if (clearDivergedTeamSelectionsForEditedPokemon()) {
    runtime.api?.persistMods?.();
  }
}

function isPokemonEditorOpen() {
  const editor = document.getElementById("pkmn-editor");
  return Boolean(editor && getComputedStyle(editor).display !== "none");
}

function clearDivergedTeamSelectionsForEditedPokemon() {
  const pokemonId = getCurrentEditedPokemonId();
  return clearDivergedTeamSelectionsForPokemon(pokemonId);
}

function clearDivergedTeamSelectionsForPokemon(pokemonId) {
  const pokemon = runtime.api?.pkmn?.[pokemonId];
  const currentTeam = getCurrentPreviewTeam();
  if (!pokemonId || !pokemon || !currentTeam) return false;

  let changed = false;
  for (const slot in currentTeam) {
    if (slot === "name" || currentTeam[slot]?.pkmn !== pokemonId) continue;

    const presetId = getTeamSelection(slot);
    if (!presetId) continue;

    const preset = getPresetById(pokemonId, presetId);
    if (preset && movesMatchPreset(pokemon, preset)) continue;

    clearTeamSelection(slot);
    changed = true;
  }

  return changed;
}

function movesMatchPreset(pokemon, preset) {
  const currentMoves = readCurrentMoves(pokemon);
  return SLOTS.every(slot => (currentMoves[slot] || "") === (preset?.moves?.[slot] || ""));
}

function applyCurrentTeamSelections() {
  if (isBattleLocked()) return;

  const currentTeam = getCurrentPreviewTeam();
  if (!currentTeam) return;

  for (const slot in currentTeam) {
    if (slot === "name") continue;
    const pokemonId = currentTeam[slot]?.pkmn;
    if (!pokemonId) continue;

    const presetId = getTeamSelection(slot);
    if (!presetId) continue;

    const preset = getPresetById(pokemonId, presetId);
    if (!preset) {
      clearTeamSelection(slot);
      continue;
    }
    applyPresetToPokemon(pokemonId, preset, false);
  }
}

function getCurrentPreviewTeam() {
  const saved = runtime.api?.saved;
  if (!saved?.previewTeams || !saved.currentPreviewTeam) return undefined;
  return saved.previewTeams[saved.currentPreviewTeam];
}

function getTeamSelectionBucket() {
  const teamId = runtime.api?.saved?.currentPreviewTeam;
  if (!teamId) return undefined;
  if (!runtime.state.teamSelections[teamId]) runtime.state.teamSelections[teamId] = {};
  return runtime.state.teamSelections[teamId];
}

function getTeamSelection(slot) {
  return getTeamSelectionBucket()?.[slot] || "";
}

function setTeamSelection(slot, presetId) {
  const bucket = getTeamSelectionBucket();
  if (!bucket) return;
  bucket[slot] = presetId;
}

function clearTeamSelection(slot) {
  const bucket = getTeamSelectionBucket();
  if (bucket) delete bucket[slot];
}

function swapTeamSelections(slotA, slotB) {
  const bucket = getTeamSelectionBucket();
  if (!bucket) return;
  const temp = bucket[slotA];
  bucket[slotA] = bucket[slotB];
  bucket[slotB] = temp;
  if (bucket[slotA] === undefined) delete bucket[slotA];
  if (bucket[slotB] === undefined) delete bucket[slotB];
  runtime.api?.save();
}

function rememberOpenTeamSlotsForPokemon(pokemonId, presetId) {
  const currentTeam = getCurrentPreviewTeam();
  if (!currentTeam) return;

  for (const slot in currentTeam) {
    if (currentTeam[slot]?.pkmn === pokemonId) setTeamSelection(slot, presetId);
  }
}

function getCurrentEditedPokemonId() {
  try {
    return typeof currentEditedPkmn === "undefined" ? undefined : currentEditedPkmn;
  } catch (error) {
    return undefined;
  }
}

function refreshPokemonViews(pokemonId) {
  if (typeof setPkmnTeam === "function") {
    const exploreTeam = document.getElementById("explore-team");
    if (exploreTeam) exploreTeam.innerHTML = "";
    setPkmnTeam();
  }
  callUpdatePreviewTeam();
  if (isPokemonEditorOpen() && getCurrentEditedPokemonId() === pokemonId) {
    clearPokemonEditorMoveLists();
    if (typeof tooltipData === "function") tooltipData("pkmnEditor", pokemonId);
  }
}

function clearPokemonEditorMoveLists() {
  document.getElementById("pkmn-editor-current-moves")?.replaceChildren();
  document.getElementById("pkmn-editor-movepool")?.replaceChildren();
}

function callUpdatePreviewTeam() {
  if (typeof window.updatePreviewTeam === "function" && runtime.api.saved.currentArea === undefined) {
    window.updatePreviewTeam();
  }
}

function movesSignature(moves) {
  return SLOTS.map(slot => moves?.[slot] || "").join("|");
}

function setEditorStatus(text) {
  const status = document.querySelector(`#${EDITOR_PANEL_ID} .move-presets-status`);
  if (status) status.textContent = text || "";
}
