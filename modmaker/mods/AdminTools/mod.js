const MOD_ID = "adminDebugger";
const BUTTON_ID = "admin-debugger-open";
const PANEL_ID = "admin-debugger-panel";
const STYLE_ID = "admin-debugger-style";
const SLOT_IDS = ["slot1", "slot2", "slot3", "slot4", "slot5", "slot6"];
const ROTATION_SPECS = [
  { key: "wild", label: "Wild Areas", currentName: "rotationWildCurrent", maxName: "rotationWildMax", fallbackMax: 12, bridgeKey: "wild", refreshName: "setWildAreas", menuId: "explore-menu", headerMatch: "Wild Areas" },
  { key: "dungeon", label: "Dungeons", currentName: "rotationDungeonCurrent", maxName: "rotationDungeonMax", fallbackMax: 3, bridgeKey: "dungeon", refreshName: "setDungeonAreas", menuId: "explore-menu", headerMatch: "Dungeons" },
  { key: "event", label: "Events", currentName: "rotationEventCurrent", maxName: "rotationEventMax", fallbackMax: 6, bridgeKey: "event", refreshName: "setEventAreas", menuId: "explore-menu", headerMatch: "Events" },
  { key: "dimension", label: "Mega Dimension", currentName: "rotationDimensionCurrent", maxName: "rotationDimensionMax", fallbackMax: 1, bridgeKey: "dimension", refreshName: "updateMegaDimension", menuId: "dimension-menu", headerMatch: "Mega-Dimension" }
];

UltraMods.define({
  id: MOD_ID,
  name: "Admin Debugger",
  description: "Admin panel to give coins, items, Pokemon and edit team levels.",
  image: "img/items/abilityPatch.png",
  version: "1.1",
  author: "UltraPokechill",
  category: "Debug",
  hooks: {
    onToggle(api, payload, state) {
      if (payload.enabled) {
        mount(api, state);
        refreshPanel(api);
      } else {
        teardown();
      }
    },
    onRefresh(api, payload, state) {
      if (!api.isEnabled(MOD_ID)) return;
      mount(api, state);
      refreshPanel(api);
    }
  }
});

function mount(api, state) {
  injectStyle();
  ensureButton(api, state);
  ensurePanel(api, state);
}

function teardown() {
  document.getElementById(BUTTON_ID)?.remove();
  document.getElementById(PANEL_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();
}

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${BUTTON_ID}{
      position: fixed;
      right: 0.8rem;
      bottom: 0.8rem;
      z-index: 1150;
      min-width: 5.8rem;
      min-height: 2.6rem;
      border: 1px solid rgba(255,255,255,0.45);
      border-radius: 0.45rem;
      background: var(--light1);
      color: white;
      box-shadow: rgba(0,0,0,0.35) 0 0.25rem 0.6rem;
      cursor: pointer;
      font-size: 1.05rem;
    }

    #${PANEL_ID}{
      position: fixed;
      right: 0.8rem;
      bottom: 4rem;
      z-index: 1150;
      width: min(33rem, calc(100vw - 1.6rem));
      max-height: min(42rem, 78vh);
      overflow: auto;
      overflow-x: hidden;
      color: white;
      background:
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cg fill='white' fill-opacity='0.03'%3E%3Cpolygon points='6 1 8 5 12 6 8 8 6 12 4 8 0 6 4 5'/%3E%3C/g%3E%3C/svg%3E"),
        var(--dark1);
      border: 1px solid rgba(255,255,255,0.35);
      border-radius: 0.5rem;
      box-shadow: rgba(0,0,0,0.45) 0 0.45rem 0.8rem;
    }

    .admin-debugger-head{
      position: sticky;
      top: 0;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.6rem;
      background: var(--light1);
      border-bottom: 1px solid rgba(255,255,255,0.2);
    }

    .admin-debugger-head strong{
      font-size: 1.25rem;
      font-weight: 400;
    }

    .admin-debugger-close,
    .admin-debugger-action{
      border: 0;
      border-radius: 0.35rem;
      background: var(--dark2);
      color: var(--light2);
      min-height: 2.15rem;
      padding: 0.25rem 0.55rem;
      cursor: pointer;
      font-size: 0.95rem;
    }

    .admin-debugger-close{
      width: 2.3rem;
      color: white;
    }

    .admin-debugger-body{
      display: grid;
      gap: 0.65rem;
      padding: 0.65rem;
    }

    .admin-debugger-section{
      display: grid;
      gap: 0.5rem;
      padding: 0.6rem;
      background: var(--light1);
      border: 1px solid rgba(255,255,255,0.16);
      border-radius: 0.45rem;
    }

    .admin-debugger-section h3{
      margin: 0;
      font-size: 1.1rem;
      font-weight: 400;
      color: white;
    }

    .admin-debugger-grid{
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.45rem;
      align-items: center;
    }

    .admin-debugger-row{
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.45rem;
      align-items: center;
    }

    .admin-debugger-inline{
      display: flex;
      align-items: center;
      gap: 0.45rem;
      min-width: 0;
    }

    .admin-debugger-count{
      min-height: 2.15rem;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.45rem;
      background: var(--dark1);
      color: var(--light2);
      border-radius: 0.35rem;
      overflow-wrap: anywhere;
    }

    .admin-debugger-count img,
    .admin-debugger-team-img{
      width: 2rem;
      height: 2rem;
      object-fit: contain;
      image-rendering: pixelated;
      flex-shrink: 0;
    }

    #${PANEL_ID} input,
    #${PANEL_ID} select{
      min-width: 0;
      width: 100%;
      height: 2.15rem;
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 0.35rem;
      background: var(--dark1);
      color: white;
      padding: 0 0.45rem;
      font-size: 0.95rem;
    }

    .admin-debugger-action.primary{
      background: rgb(90, 133, 113);
      color: white;
    }

    .admin-debugger-action.warn{
      background: rgb(164, 103, 67);
      color: white;
    }

    .admin-debugger-team-list{
      display: grid;
      gap: 0.45rem;
    }

    .admin-debugger-rotation-list{
      display: grid;
      gap: 0.45rem;
    }

    .admin-debugger-rotation-row{
      display: grid;
      grid-template-columns: minmax(0, 1fr) 2.4rem 4.8rem auto auto;
      gap: 0.35rem;
      align-items: center;
      padding: 0.35rem;
      background: var(--dark1);
      border-radius: 0.35rem;
    }

    .admin-debugger-rotation-name{
      display: grid;
      gap: 0.1rem;
      min-width: 0;
      line-height: 1.05rem;
    }

    .admin-debugger-rotation-name small{
      color: var(--light2);
      opacity: 0.9;
    }

    .admin-debugger-team-row{
      display: grid;
      grid-template-columns: 2.4rem minmax(0, 1fr) 5.4rem 4.4rem auto;
      gap: 0.45rem;
      align-items: center;
      min-height: 2.8rem;
      padding: 0.35rem;
      background: var(--dark1);
      border-radius: 0.35rem;
    }

    .admin-debugger-team-name{
      min-width: 0;
      display: grid;
      line-height: 1.05rem;
      overflow-wrap: anywhere;
    }

    .admin-debugger-team-name small{
      color: var(--light2);
      opacity: 0.9;
    }

    .admin-debugger-shiny-toggle{
      min-height: 2.15rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.3rem;
      padding: 0 0.35rem;
      background: var(--dark2);
      color: var(--light2);
      border-radius: 0.35rem;
      cursor: pointer;
      font-size: 0.85rem;
      user-select: none;
    }

    #${PANEL_ID} input.admin-debugger-shiny-checkbox{
      width: 1rem;
      min-width: 1rem;
      height: 1rem;
      padding: 0;
      cursor: pointer;
    }

    .admin-debugger-empty{
      min-height: 2.8rem;
      display: flex;
      align-items: center;
      padding: 0.5rem;
      background: var(--dark1);
      color: var(--light2);
      border-radius: 0.35rem;
    }

    @media (max-width: 540px){
      #${PANEL_ID}{
        right: 0;
        bottom: 3.6rem;
        width: 100%;
        max-height: 82vh;
        border-radius: 0.5rem 0.5rem 0 0;
      }

      #${BUTTON_ID}{
        right: 0.5rem;
        bottom: 0.5rem;
      }

      .admin-debugger-grid,
      .admin-debugger-row{
        grid-template-columns: 1fr;
      }

      .admin-debugger-team-row{
        grid-template-columns: 2.4rem minmax(0, 1fr);
      }

      .admin-debugger-rotation-row{
        grid-template-columns: minmax(0, 1fr) 2.4rem 4.8rem auto auto;
      }

      .admin-debugger-team-row input,
      .admin-debugger-shiny-toggle,
      .admin-debugger-team-row button{
        grid-column: 1 / -1;
      }
    }
  `;

  document.head.appendChild(style);
}

function ensureButton(api, state) {
  if (document.getElementById(BUTTON_ID)) return;

  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.type = "button";
  button.textContent = "Admin";
  button.addEventListener("click", () => {
    ensurePanel(api, state);
    const panel = document.getElementById(PANEL_ID);
    const isOpen = panel.style.display !== "none";
    panel.style.display = isOpen ? "none" : "block";
    state.open = !isOpen;
    if (!isOpen) refreshPanel(api);
  });
  document.body.appendChild(button);
}

function ensurePanel(api, state) {
  if (document.getElementById(PANEL_ID)) return;

  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.style.display = state.open ? "block" : "none";
  panel.innerHTML = `
    <div class="admin-debugger-head">
      <strong>Admin Debugger</strong>
      <button type="button" class="admin-debugger-close" data-action="close">X</button>
    </div>
    <div class="admin-debugger-body">
      <section class="admin-debugger-section">
        <h3>Moedas</h3>
        <div class="admin-debugger-grid">
          <div class="admin-debugger-count" id="admin-bottle-count"></div>
          <div class="admin-debugger-count" id="admin-golden-count"></div>
          <input id="admin-currency-amount" type="number" min="1" max="999999" value="100">
          <button type="button" class="admin-debugger-action primary" data-action="give-bottle">Dar Bottle Caps</button>
          <input id="admin-gold-amount" type="number" min="1" max="999999" value="10">
          <button type="button" class="admin-debugger-action primary" data-action="give-golden">Dar Golden Caps</button>
        </div>
      </section>

      <section class="admin-debugger-section">
        <h3>Itens</h3>
        <div class="admin-debugger-row">
          <select id="admin-item-select"></select>
          <input id="admin-item-amount" type="number" min="1" max="999999" value="1">
        </div>
        <div class="admin-debugger-grid">
          <button type="button" class="admin-debugger-action primary" data-action="give-item">Dar item</button>
          <button type="button" class="admin-debugger-action warn" data-action="give-all-items">Todos x999</button>
        </div>
      </section>

      <section class="admin-debugger-section">
        <h3>Pokemon</h3>
        <div class="admin-debugger-row">
          <select id="admin-pokemon-select"></select>
          <input id="admin-pokemon-level" type="number" min="1" max="100" value="50">
        </div>
        <button type="button" class="admin-debugger-action primary" data-action="give-pokemon">Give Pokemon</button>
      </section>

      <section class="admin-debugger-section">
        <h3>Rotation Skipper</h3>
        <div class="admin-debugger-rotation-list" id="admin-rotation-list"></div>
        <div class="admin-debugger-grid">
          <button type="button" class="admin-debugger-action primary" data-action="skip-all-rotations">Skip all rotations</button>
          <button type="button" class="admin-debugger-action" data-action="sync-rotations">Sync real timer</button>
        </div>
      </section>

      <section class="admin-debugger-section">
        <h3>Time</h3>
        <div class="admin-debugger-grid">
          <input id="admin-team-level" type="number" min="1" max="100" value="100">
          <button type="button" class="admin-debugger-action primary" data-action="set-team-level">Set level do time</button>
          <button type="button" class="admin-debugger-action" data-action="heal-team">Curar time</button>
          <button type="button" class="admin-debugger-action" data-action="refresh">Atualizar</button>
        </div>
        <div class="admin-debugger-team-list" id="admin-team-list"></div>
      </section>
    </div>
  `;

  panel.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (button.matches("input[type='checkbox']")) return;
    handleAction(api, state, button);
  });

  panel.addEventListener("change", event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    handleAction(api, state, button);
  });

  document.body.appendChild(panel);
  refreshPanel(api);
}

function handleAction(api, state, button) {
  const action = button.dataset.action;

  if (action === "close") {
    document.getElementById(PANEL_ID).style.display = "none";
    state.open = false;
    return;
  }

  if (action === "give-bottle") {
    api.giveItem("bottleCap", readAmount("admin-currency-amount", 100));
    refreshPanel(api);
    return;
  }

  if (action === "give-golden") {
    api.giveItem("goldenBottleCap", readAmount("admin-gold-amount", 10));
    refreshPanel(api);
    return;
  }

  if (action === "give-item") {
    const id = document.getElementById("admin-item-select")?.value;
    if (id) api.giveItem(id, readAmount("admin-item-amount", 1));
    refreshPanel(api);
    return;
  }

  if (action === "give-all-items") {
    giveAllItems(api, 999);
    refreshPanel(api);
    return;
  }

  if (action === "give-pokemon") {
    const id = document.getElementById("admin-pokemon-select")?.value;
    if (id) api.givePkmn(id, readLevel("admin-pokemon-level", 50));
    refreshPanel(api);
    return;
  }

  if (action === "step-rotation") {
    stepRotation(api, button.dataset.rotationKey, Number(button.dataset.delta) || 1);
    refreshPanel(api);
    return;
  }

  if (action === "set-rotation") {
    setRotationFromInput(api, button.dataset.rotationKey);
    refreshPanel(api);
    return;
  }

  if (action === "skip-all-rotations") {
    for (const spec of ROTATION_SPECS) stepRotation(api, spec.key, 1, false);
    refreshChangedRotationViews();
    refreshPanel(api);
    return;
  }

  if (action === "sync-rotations") {
    syncRealRotations();
    refreshChangedRotationViews();
    refreshPanel(api);
    return;
  }

  if (action === "set-slot-level") {
    const id = button.dataset.pokemonId;
    const input = button.dataset.inputId;
    if (id) api.setPokemonLevel(id, readLevel(input, 50));
    refreshPanel(api);
    return;
  }

  if (action === "set-slot-shiny") {
    const id = button.dataset.pokemonId;
    if (id) setPokemonShiny(api, id, button.checked === true);
    refreshPanel(api);
    return;
  }

  if (action === "set-team-level") {
    setTeamLevel(api, readLevel("admin-team-level", 100));
    refreshPanel(api);
    return;
  }

  if (action === "heal-team") {
    healTeam(api);
    refreshPanel(api);
    return;
  }

  if (action === "refresh") {
    api.refreshGame();
    refreshPanel(api);
  }
}

function refreshPanel(api) {
  const panel = document.getElementById(PANEL_ID);
  if (!panel) return;

  updateCurrency(api);
  updateSelect("admin-item-select", getItemEntries(api), api);
  updateSelect("admin-pokemon-select", getPokemonEntries(api), api);
  updateRotations(api);
  updateTeam(api);
}

function updateCurrency(api) {
  const items = api.item || {};
  setCount("admin-bottle-count", "img/items/bottleCap.png", "Bottle Caps", items.bottleCap?.got || 0, api);
  setCount("admin-golden-count", "img/items/goldenBottleCap.png", "Golden Caps", items.goldenBottleCap?.got || 0, api);
}

function setCount(id, image, label, value, api) {
  const target = document.getElementById(id);
  if (!target) return;
  target.innerHTML = `<img src="${escapeAttr(image)}" alt=""> <span>${escapeHtml(label)}: ${api.formatNumber(value)}</span>`;
}

function updateSelect(id, entries, api) {
  const select = document.getElementById(id);
  if (!select) return;

  const previous = select.value;
  select.innerHTML = entries.map(entry => {
    const entryId = typeof entry === "string" ? entry : entry.id;
    return `<option value="${escapeAttr(entryId)}">${escapeHtml(api.formatName(entryId))}</option>`;
  }).join("");

  if (previous && entries.some(entry => (typeof entry === "string" ? entry : entry.id) === previous)) select.value = previous;
}

function updateRotations(api) {
  const list = document.getElementById("admin-rotation-list");
  if (!list) return;

  list.innerHTML = ROTATION_SPECS.map(spec => {
    const current = getRotationCurrent(spec);
    const max = getRotationMax(spec);
    const inputId = `admin-rotation-${spec.key}`;
    return `
      <div class="admin-debugger-rotation-row">
        <span class="admin-debugger-rotation-name">
          <strong>${escapeHtml(spec.label)}</strong>
          <small>Rotation ${escapeHtml(current)} / ${escapeHtml(max)}</small>
        </span>
        <button type="button" class="admin-debugger-action" data-action="step-rotation" data-rotation-key="${escapeAttr(spec.key)}" data-delta="-1">-</button>
        <input id="${escapeAttr(inputId)}" type="number" min="1" max="${escapeAttr(max)}" value="${escapeAttr(current)}">
        <button type="button" class="admin-debugger-action" data-action="set-rotation" data-rotation-key="${escapeAttr(spec.key)}">Set</button>
        <button type="button" class="admin-debugger-action primary" data-action="step-rotation" data-rotation-key="${escapeAttr(spec.key)}" data-delta="1">Next</button>
      </div>
    `;
  }).join("");
}

function stepRotation(api, key, delta, refreshView = true) {
  const spec = ROTATION_SPECS.find(entry => entry.key === key);
  if (!spec) return;

  const max = getRotationMax(spec);
  const current = getRotationCurrent(spec);
  const next = wrapRotation(current + delta, max);
  setRotationValue(spec.currentName, next);
  if (refreshView) refreshRotationView(spec);
}

function setRotationFromInput(api, key) {
  const spec = ROTATION_SPECS.find(entry => entry.key === key);
  if (!spec) return;

  const max = getRotationMax(spec);
  const input = document.getElementById(`admin-rotation-${spec.key}`);
  const next = wrapRotation(Math.floor(Number(input?.value) || getRotationCurrent(spec)), max);
  setRotationValue(spec.currentName, next);
  refreshRotationView(spec);
}

function syncRealRotations() {
  try {
    if (typeof getSeed === "function") getSeed();
  } catch (error) {
    try {
      window.eval("getSeed()");
    } catch (evalError) {}
  }
}

function refreshChangedRotationViews() {
  for (const spec of ROTATION_SPECS) refreshRotationView(spec);
}

function refreshRotationView(spec) {
  if (!isMenuOpen(spec.menuId)) return;

  const headerText = document.getElementById("explore-menu-header")?.textContent || document.getElementById("dimension-menu-header")?.textContent || "";
  if (spec.menuId === "explore-menu" && !headerText.includes(spec.headerMatch)) return;

  try {
    if (spec.refreshName === "updateMegaDimension") {
      if (typeof assignMegaDimension === "function") assignMegaDimension();
      if (typeof updateMegaDimension === "function") updateMegaDimension();
      return;
    }

    const refreshFn = getGlobalFunction(spec.refreshName);
    if (typeof refreshFn === "function") refreshFn();
  } catch (error) {
    console.warn(`[Admin Debugger] Failed to refresh ${spec.label} after rotation skip.`, error);
  }
}

function isMenuOpen(id) {
  const menu = document.getElementById(id);
  if (!menu) return false;
  const style = window.getComputedStyle(menu);
  return style.display !== "none" && style.visibility !== "hidden";
}

function getRotationCurrent(spec) {
  return clampRotation(readGlobalNumber(spec.currentName, 1), getRotationMax(spec));
}

function getRotationMax(spec) {
  const bridgeValue = window.SoManyRotations?.max?.[spec.bridgeKey];
  if (Number.isFinite(Number(bridgeValue)) && Number(bridgeValue) > 0) {
    return Math.max(1, Math.floor(Number(bridgeValue)));
  }

  return Math.max(1, Math.floor(readGlobalNumber(spec.maxName, spec.fallbackMax)));
}

function clampRotation(value, max) {
  const numeric = Math.floor(Number(value) || 1);
  return Math.max(1, Math.min(max, numeric));
}

function wrapRotation(value, max) {
  const numeric = Math.floor(Number(value) || 1);
  return ((numeric - 1) % max + max) % max + 1;
}

function readGlobalNumber(name, fallback) {
  let value;
  try {
    value = window.eval(name);
  } catch (error) {
    value = window[name];
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function setRotationValue(name, value) {
  try {
    window.eval(`${name} = ${Math.floor(Number(value) || 1)}`);
  } catch (error) {}

  try {
    window[name] = Math.floor(Number(value) || 1);
  } catch (error) {}
}

function getGlobalFunction(name) {
  try {
    return typeof window[name] === "function" ? window[name] : window.eval(name);
  } catch (error) {
    return window[name];
  }
}

function updateTeam(api) {
  const list = document.getElementById("admin-team-list");
  if (!list) return;

  const slots = getTeamSlots(api);
  if (slots.length === 0) {
    list.innerHTML = `<div class="admin-debugger-empty">No Pokemon in current team.</div>`;
    return;
  }

  list.innerHTML = slots.map(slot => {
    const pokemon = api.pkmn?.[slot.id] || {};
    const level = pokemon.level || 1;
    const hpText = pokemon.playerHpMax
      ? `${api.formatNumber(pokemon.playerHp || 0)} / ${api.formatNumber(pokemon.playerHpMax)} HP`
      : `Lv ${level}`;
    const inputId = `admin-level-${slot.slot}`;
    const shinyChecked = pokemon.shiny === true ? "checked" : "";

    return `
      <div class="admin-debugger-team-row">
        <img class="admin-debugger-team-img" src="img/pkmn/sprite/${escapeAttr(slot.id)}.png" alt="" onerror="this.src='img/items/dex.png'">
        <span class="admin-debugger-team-name">
          <strong>${escapeHtml(api.formatName(slot.id))}</strong>
          <small>${escapeHtml(slot.slot.toUpperCase())} | ${escapeHtml(hpText)}</small>
        </span>
        <label class="admin-debugger-shiny-toggle">
          <input class="admin-debugger-shiny-checkbox" type="checkbox" ${shinyChecked} data-action="set-slot-shiny" data-pokemon-id="${escapeAttr(slot.id)}">
          <span>Shiny</span>
        </label>
        <input id="${escapeAttr(inputId)}" type="number" min="1" max="100" value="${escapeAttr(level)}">
        <button type="button" class="admin-debugger-action primary" data-action="set-slot-level" data-pokemon-id="${escapeAttr(slot.id)}" data-input-id="${escapeAttr(inputId)}">Set</button>
      </div>
    `;
  }).join("");
}

function getItemEntries(api) {
  const items = api.item || {};
  return Object.keys(items)
    .filter(id => {
      const data = items[id];
      return data && data.id === id && id !== "nothing";
    })
    .sort((a, b) => api.formatName(a).localeCompare(api.formatName(b)));
}

function getPokemonEntries(api) {
  const pokemon = api.pkmn || {};
  return Object.keys(pokemon)
    .filter(id => {
      const data = pokemon[id];
      return data && data.id === id && data.hidden !== true;
    })
    .sort((a, b) => api.formatName(a).localeCompare(api.formatName(b)));
}

function getTeamSlots(api) {
  const saved = api.saved || {};
  const preview = saved.previewTeams?.[saved.currentPreviewTeam] || {};
  const runtime = api.team || {};
  const slots = [];

  for (const slot of SLOT_IDS) {
    const runtimeId = runtime[slot]?.pkmn?.id;
    const previewId = preview[slot]?.pkmn;
    const id = runtimeId || previewId;
    if (!id || !api.pkmn?.[id]) continue;
    slots.push({ slot, id });
  }

  return slots;
}

function giveAllItems(api, amount) {
  const items = api.item || {};
  for (const id of Object.keys(items)) {
    if (!items[id] || items[id].id !== id || id === "nothing") continue;
    items[id].got = Math.max(Number(items[id].got) || 0, amount);
    items[id].newItem = Math.max(Number(items[id].newItem) || 0, amount);
  }
  api.refreshGame();
  api.save();
}

function setTeamLevel(api, level) {
  for (const slot of getTeamSlots(api)) {
    api.setPokemonLevel(slot.id, level);
  }
  api.refreshGame();
  api.save();
}

function healTeam(api) {
  const pokemon = api.pkmn || {};
  for (const slot of getTeamSlots(api)) {
    if (!pokemon[slot.id]?.playerHpMax) continue;
    pokemon[slot.id].playerHp = pokemon[slot.id].playerHpMax;
  }
  api.refreshGame();
  api.save();
}

function setPokemonShiny(api, id, enabled) {
  const pokemon = api.pkmn?.[id];
  if (!pokemon) return;

  if (enabled) {
    pokemon.shiny = true;
    pokemon.shinyDisabled = undefined;
  } else {
    pokemon.shiny = undefined;
    pokemon.shinyDisabled = undefined;
    pokemon.starsign = undefined;
  }

  api.refreshGame();
  if (typeof updatePokedex === "function") updatePokedex();
  api.save();
}

function readAmount(id, fallback) {
  const input = document.getElementById(id);
  return Math.max(1, Math.min(999999, Math.floor(Number(input?.value) || fallback)));
}

function readLevel(id, fallback) {
  const input = document.getElementById(id);
  return Math.max(1, Math.min(100, Math.floor(Number(input?.value) || fallback)));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
