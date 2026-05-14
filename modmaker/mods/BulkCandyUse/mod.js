const MOD_ID = "bulkCandyUse";
const RARE_CANDY_ID = "rareCandy";
const STYLE_ID = "bulk-candy-use-style";

UltraMods.define({
  id: MOD_ID,
  name: "Bulk Candy Use",
  description: "Adds bulk-use choices for Rare Candy when selecting a Pokemon.",
  image: "img/items/rareCandy.png",
  version: "1.1",
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
      if (payload.itemId !== RARE_CANDY_ID) return undefined;

      installStyles();

      const pokemon = api.pkmn?.[payload.pokemonId];
      const candy = api.item?.[RARE_CANDY_ID];
      if (!pokemon || (pokemon.caught || 0) <= 0) return { hide: true };
      if ((Number(candy?.got) || 0) <= 0) return { hide: true };
      if (getLevel(pokemon) >= 100) return { hide: true };

      payload.element.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        showCandyMenu(api, payload.pokemonId);
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
    .mod-bulk-candy-summary {
      align-items: center;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      justify-content: center;
      line-height: 1.25;
      min-width: 14rem;
      padding: 0.35rem 0.7rem;
      text-align: center;
    }

    .mod-bulk-candy-options {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      justify-content: center;
      width: 100%;
    }

    .mod-bulk-candy-button {
      background: #efe2b5;
      border: 0.18rem solid #8c8065;
      border-radius: 0.45rem;
      color: #38332a;
      cursor: pointer;
      font-family: inherit;
      font-size: 1.35rem;
      font-weight: 700;
      line-height: 1;
      min-width: 4.8rem;
      padding: 0.42rem 0.55rem;
      text-align: center;
    }

    .mod-bulk-candy-button:hover,
    .mod-bulk-candy-button:focus-visible {
      background: #fff3c9;
      outline: none;
      transform: translateY(-0.05rem);
    }
  `;
  document.head.appendChild(style);
}

function cleanup() {
  document.getElementById(STYLE_ID)?.remove();
}

function showCandyMenu(api, pokemonId) {
  const pokemon = api.pkmn?.[pokemonId];
  const candy = api.item?.[RARE_CANDY_ID];
  if (!pokemon || !candy) return;

  const level = getLevel(pokemon);
  const owned = getOwnedCandy(candy);
  const maxUse = Math.min(owned, 100 - level);

  if (owned <= 0) {
    showGameMessage("You do not have Rare Candy.");
    return;
  }

  if (maxUse <= 0) {
    showGameMessage(`${api.formatName(pokemonId)} is already level 100.`);
    return;
  }

  const options = getUseOptions(maxUse);
  const title = document.getElementById("tooltipTitle");
  const top = document.getElementById("tooltipTop");
  const mid = document.getElementById("tooltipMid");
  const bottom = document.getElementById("tooltipBottom");

  if (!title || !mid || !bottom || typeof openTooltip !== "function") {
    useRareCandy(api, pokemonId, maxUse);
    return;
  }

  if (top) {
    top.style.display = "none";
    top.innerHTML = "";
  }

  title.style.display = "inline";
  title.innerHTML = "Rare Candy";
  mid.style.display = "inline";
  mid.innerHTML = `
    <div class="mod-bulk-candy-summary">
      <strong>${api.formatName(pokemonId)}</strong>
      <span>Level ${level} -> ${Math.min(100, level + maxUse)}</span>
      <span>Rare Candy: x${owned}</span>
    </div>
  `;
  bottom.style.display = "inline";
  bottom.innerHTML = `
    <div class="mod-bulk-candy-options">
      ${options.map(amount => {
        const label = amount === maxUse ? `Max x${amount}` : `x${amount}`;
        return `<button type="button" class="mod-bulk-candy-button" data-bulk-candy-amount="${amount}">${label}</button>`;
      }).join("")}
    </div>
    <span id="prevent-tooltip-exit"></span>
  `;

  bottom.querySelectorAll("[data-bulk-candy-amount]").forEach(button => {
    button.addEventListener("click", () => {
      useRareCandy(api, pokemonId, Number(button.dataset.bulkCandyAmount));
    });
  });

  openTooltip();
}

function getUseOptions(maxUse) {
  return [1, 10, 25, 50, maxUse]
    .map(amount => Math.min(amount, maxUse))
    .filter((amount, index, list) => amount > 0 && list.indexOf(amount) === index);
}

function useRareCandy(api, pokemonId, amount) {
  const pokemon = api.pkmn?.[pokemonId];
  const candy = api.item?.[RARE_CANDY_ID];
  if (!pokemon || !candy) return;

  const startLevel = getLevel(pokemon);
  const owned = getOwnedCandy(candy);
  const quantity = Math.min(Math.max(1, Math.floor(Number(amount) || 1)), owned, 100 - startLevel);
  if (quantity <= 0) return;

  ensurePokemonCollections(pokemon);

  const learnedMoves = [];
  for (let count = 0; count < quantity; count++) {
    if (getLevel(pokemon) >= 100) break;

    pokemon.level = getLevel(pokemon) + 1;
    const learnedMove = learnMoveForLevel(pokemon, pokemon.level);

    if (learnedMove && pokemon.level % 7 === 0 && !pokemon.movepool.includes(learnedMove)) {
      pokemon.movepool.push(learnedMove);
      learnedMoves.push(learnedMove);
    }
  }

  const used = getLevel(pokemon) - startLevel;
  candy.got = Math.max(0, owned - used);

  const evolvedName = checkLevelEvolution(api, pokemonId);
  safeCall(() => window.UltraShinyEvolve?.repairShinyEvolution?.(pokemonId));
  refreshGame(api);

  if (typeof closeTooltip === "function") closeTooltip();
  if (candy.got <= 0 && typeof exitTmTeaching === "function") exitTmTeaching();

  const pokemonName = api.formatName(pokemonId);
  const moveText = learnedMoves.length > 0
    ? ` Learned ${learnedMoves.map(moveId => api.formatName(moveId)).join(", ")}.`
    : "";
  const evolutionText = evolvedName ? ` ${evolvedName} was unlocked.` : "";
  showGameMessage(`Used ${used} Rare Candy on ${pokemonName}. Level ${startLevel} -> ${getLevel(pokemon)}.${moveText}${evolutionText}`);
}

function learnMoveForLevel(pokemon, level) {
  if (typeof learnPkmnMove !== "function") return undefined;
  return learnPkmnMove(pokemon.id, level);
}

function checkLevelEvolution(api, pokemonId) {
  const pokemon = api.pkmn?.[pokemonId];
  if (!pokemon || typeof pokemon.evolve !== "function" || typeof givePkmn !== "function") return "";

  const evolution = pokemon.evolve()?.[1];
  const requiredLevel = Number(evolution?.level) || 0;
  const evolvedPokemon = evolution?.pkmn;
  if (!evolvedPokemon?.id || requiredLevel <= 0) return "";
  if (getLevel(pokemon) < requiredLevel) return "";
  if ((api.pkmn?.[evolvedPokemon.id]?.caught || 0) > 0) return "";

  givePkmn(evolvedPokemon, 1);
  return api.formatName(evolvedPokemon.id);
}

function ensurePokemonCollections(pokemon) {
  if (!Array.isArray(pokemon.movepool)) pokemon.movepool = [];
  if (!pokemon.moves) pokemon.moves = { slot1: null, slot2: null, slot3: null, slot4: null };
}

function refreshGame(api) {
  api.refreshGame();
  safeCall(() => { if (typeof updatePokedex === "function") updatePokedex(); });
  safeCall(() => { if (typeof updateItemBag === "function") updateItemBag(); });
  api.save();
}

function getLevel(pokemon) {
  return Math.max(1, Math.min(100, Math.floor(Number(pokemon?.level) || 1)));
}

function getOwnedCandy(candy) {
  return Math.max(0, Math.floor(Number(candy?.got) || 0));
}

function showGameMessage(message) {
  if (typeof showMessage === "function") {
    showMessage(message);
    return;
  }

  console.log(`[Bulk Candy Use] ${message}`);
}

function safeCall(callback) {
  try {
    callback();
  } catch (error) {
    console.warn("[Bulk Candy Use] refresh failed", error);
  }
}
