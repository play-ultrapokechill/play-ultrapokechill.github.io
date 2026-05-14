const MOD_ID = "multiHeartScale";
const HEART_SCALE_ID = "heartScale";
const STYLE_ID = "multi-heart-scale-style";

UltraMods.define({
  id: MOD_ID,
  name: "Multi Heart Scale",
  description: "Lets Heart Scale remember multiple moves at once, spending one Heart Scale per selected move.",
  image: "img/items/heartScale.png",
  version: "1.0",
  author: "UltraPokechill",
  category: "Items",
  hooks: {
    onToggle(api, payload) {
      if (payload.enabled) installStyles();
      else cleanup();
    },
    onRefresh(api) {
      if (api.isEnabled(MOD_ID)) installStyles();
    },
    onItemTarget(api, payload) {
      if (payload.itemId !== HEART_SCALE_ID) return undefined;

      installStyles();

      const pokemon = api.pkmn?.[payload.pokemonId];
      if (!pokemon || !getRememberableMoves(api, pokemon).length) return { hide: true };

      payload.element.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        showRememberMenu(api, payload.pokemonId);
      });

      return { handled: true };
    }
  }
});

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .multi-heart-scale-summary {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      justify-content: center;
      width: 100%;
    }

    .multi-heart-scale-summary img {
      image-rendering: pixelated;
      width: 2.25rem;
    }

    .multi-heart-scale-count {
      background: var(--dark2);
      border-radius: 0.35rem;
      color: var(--light2);
      padding: 0.25rem 0.55rem;
    }

    .multi-heart-scale-list {
      display: grid;
      gap: 0.4rem;
      grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
      margin: 0.35rem auto;
      max-height: min(52vh, 26rem);
      overflow-y: auto;
      padding: 0.15rem;
      width: min(42rem, 100%);
    }

    .multi-heart-scale-move {
      align-items: center;
      background: var(--dark1);
      border: 0.16rem solid var(--light2);
      border-radius: 0.35rem;
      color: white;
      cursor: pointer;
      display: grid;
      font-family: inherit;
      font-size: 1.05rem;
      gap: 0.35rem;
      grid-template-columns: 1.35rem 1fr auto;
      min-height: 2.35rem;
      padding: 0.3rem 0.45rem;
      text-align: left;
    }

    .multi-heart-scale-move::before {
      border: 0.12rem solid currentColor;
      border-radius: 0.2rem;
      content: "";
      height: 0.85rem;
      width: 0.85rem;
    }

    .multi-heart-scale-move.selected {
      background: #efe2b5;
      color: #38332a;
    }

    .multi-heart-scale-move.selected::before {
      background: currentColor;
      box-shadow: inset 0 0 0 0.18rem #efe2b5;
    }

    .multi-heart-scale-type {
      border-radius: 0.25rem;
      color: white;
      font-size: 0.75rem;
      line-height: 1;
      padding: 0.2rem 0.35rem;
      text-align: center;
    }

    .multi-heart-scale-actions {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      justify-content: center;
      width: 100%;
    }

    .multi-heart-scale-button {
      background: #efe2b5;
      border: 0;
      border-radius: 0.35rem;
      color: #38332a;
      cursor: pointer;
      font-family: inherit;
      font-size: 1.05rem;
      padding: 0.45rem 0.75rem;
    }

    .multi-heart-scale-button.secondary {
      background: var(--dark1);
      color: var(--light2);
    }

    .multi-heart-scale-button:disabled {
      cursor: not-allowed;
      filter: grayscale(0.8) brightness(0.65);
    }

    .multi-heart-scale-status {
      color: var(--light2);
      flex-basis: 100%;
      min-height: 1.2rem;
      text-align: center;
    }

    .multi-heart-scale-status.error {
      color: #ffaaaa;
    }
  `;
  document.head.appendChild(style);
}

function cleanup() {
  document.getElementById(STYLE_ID)?.remove();
}

function showRememberMenu(api, pokemonId) {
  const pokemon = api.pkmn?.[pokemonId];
  const moves = getRememberableMoves(api, pokemon);
  const heartScale = api.item?.[HEART_SCALE_ID];
  const selected = new Set();

  if (!pokemon || !heartScale || !moves.length) {
    showGameMessage("No new moves to remember.");
    return;
  }

  const title = document.getElementById("tooltipTitle");
  const top = document.getElementById("tooltipTop");
  const mid = document.getElementById("tooltipMid");
  const bottom = document.getElementById("tooltipBottom");

  if (!title || !top || !mid || !bottom || typeof openTooltip !== "function") return;

  top.style.display = "inline";
  top.innerHTML = `
    <div class="multi-heart-scale-summary">
      <img src="img/items/heartScale.png" alt="">
      <span class="multi-heart-scale-count" data-heart-scale-count></span>
      <span class="multi-heart-scale-count" data-heart-scale-selected></span>
    </div>
  `;

  title.style.display = "inline";
  title.innerHTML = "Select moves to remember";

  mid.style.display = "inline";
  mid.innerHTML = `<div class="multi-heart-scale-list" id="multi-heart-scale-list"></div>`;

  bottom.style.display = "inline";
  bottom.innerHTML = `
    <div class="multi-heart-scale-actions">
      <button type="button" class="multi-heart-scale-button" data-heart-scale-confirm>Select moves</button>
      <button type="button" class="multi-heart-scale-button secondary" data-heart-scale-cancel>Cancel</button>
      <div class="multi-heart-scale-status" data-heart-scale-status></div>
    </div>
    <span id="prevent-tooltip-exit"></span>
  `;

  const list = document.getElementById("multi-heart-scale-list");
  for (const moveId of moves) {
    const button = document.createElement("button");
    const moveData = api.move?.[moveId] || {};
    const typeColor = api.typeColor?.(moveData.type) || "var(--accent)";
    button.type = "button";
    button.className = "multi-heart-scale-move";
    button.dataset.moveId = moveId;
    button.style.borderColor = typeColor;
    button.innerHTML = `
      <span>${api.formatName(moveId)}</span>
      <span class="multi-heart-scale-type" style="background:${typeColor}">${api.formatName(moveData.type || "")}</span>
    `;
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      toggleMove(selected, button, moveId);
      updateMenuState(api, selected);
    });
    list.appendChild(button);
  }

  bottom.querySelector("[data-heart-scale-confirm]")?.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    spendHeartScales(api, pokemonId, selected);
  });

  bottom.querySelector("[data-heart-scale-cancel]")?.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof closeTooltip === "function") closeTooltip();
  });

  updateMenuState(api, selected);
  openTooltip();
}

function toggleMove(selected, element, moveId) {
  if (selected.has(moveId)) {
    selected.delete(moveId);
    element.classList.remove("selected");
    return;
  }

  selected.add(moveId);
  element.classList.add("selected");
}

function updateMenuState(api, selected, message = "", error = false) {
  const owned = getOwnedHeartScales(api);
  const count = selected.size;
  const countElement = document.querySelector("[data-heart-scale-count]");
  const selectedElement = document.querySelector("[data-heart-scale-selected]");
  const confirm = document.querySelector("[data-heart-scale-confirm]");
  const status = document.querySelector("[data-heart-scale-status]");

  if (countElement) countElement.textContent = `Heart Scales: x${owned}`;
  if (selectedElement) selectedElement.textContent = `Selected: ${count}`;
  if (confirm) {
    confirm.disabled = count <= 0;
    confirm.textContent = count > 0
      ? `Spend ${count} Heart ${count === 1 ? "Scale" : "Scales"}?`
      : "Select moves";
  }

  if (status) {
    status.classList.toggle("error", error);
    status.textContent = message || (count > owned ? `You need ${count - owned} more Heart ${count - owned === 1 ? "Scale" : "Scales"}.` : "");
  }
}

function spendHeartScales(api, pokemonId, selected) {
  const pokemon = api.pkmn?.[pokemonId];
  const heartScale = api.item?.[HEART_SCALE_ID];
  const selectedMoves = Array.from(selected);
  const cost = selectedMoves.length;
  const owned = getOwnedHeartScales(api);

  if (!pokemon || !heartScale || cost <= 0) return;

  if (owned < cost) {
    updateMenuState(api, selected, `Not enough Heart Scales. You have ${owned}, selected ${cost}.`, true);
    return;
  }

  if (!Array.isArray(pokemon.movepool)) pokemon.movepool = [];
  for (const moveId of selectedMoves) {
    if (!pokemon.movepool.includes(moveId)) pokemon.movepool.push(moveId);
  }

  heartScale.got = Math.max(0, owned - cost);
  refreshGame(api);

  if (typeof closeTooltip === "function") closeTooltip();
  if (heartScale.got <= 0 && typeof exitTmTeaching === "function") exitTmTeaching();

  showGameMessage(`${api.formatName(pokemonId)} remembered ${selectedMoves.length} ${selectedMoves.length === 1 ? "move" : "moves"}.`);
}

function getRememberableMoves(api, pokemon) {
  if (!pokemon || !Array.isArray(pokemon.movepoolMemory)) return [];
  const known = new Set(Array.isArray(pokemon.movepool) ? pokemon.movepool : []);
  const seen = new Set();
  const result = [];

  for (const moveId of pokemon.movepoolMemory) {
    if (!moveId || known.has(moveId) || seen.has(moveId) || !api.move?.[moveId]) continue;
    seen.add(moveId);
    result.push(moveId);
  }

  return result;
}

function getOwnedHeartScales(api) {
  return Math.max(0, Math.floor(Number(api.item?.[HEART_SCALE_ID]?.got) || 0));
}

function refreshGame(api) {
  api.refreshGame();
  safeCall(() => { if (typeof updatePokedex === "function") updatePokedex(); });
  safeCall(() => { if (typeof updateItemBag === "function") updateItemBag(); });
  api.save();
}

function showGameMessage(message) {
  if (typeof showMessage === "function") {
    showMessage(message);
    return;
  }

  console.log(`[Multi Heart Scale] ${message}`);
}

function safeCall(callback) {
  try {
    callback();
  } catch (error) {
    console.warn("[Multi Heart Scale] refresh failed", error);
  }
}
