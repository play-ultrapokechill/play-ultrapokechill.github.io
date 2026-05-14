const MOD_ID = "allStarters";

const STARTER_GROUPS = [
  { title: "Kanto", starters: ["bulbasaur", "charmander", "squirtle", "pikachu", "eevee"] },
  { title: "Johto", starters: ["chikorita", "cyndaquil", "totodile"] },
  { title: "Hoenn", starters: ["treecko", "torchic", "mudkip"] },
  { title: "Sinnoh", starters: ["turtwig", "chimchar", "piplup"] },
  { title: "Unova", starters: ["snivy", "tepig", "oshawott"] },
  { title: "Kalos", starters: ["chespin", "fennekin", "froakie"] },
  { title: "Alola", starters: ["rowlet", "litten", "popplio"] },
  { title: "Galar", starters: ["grookey", "scorbunny", "sobble"] },
  { title: "Paldea", starters: ["sprigatito", "fuecoco", "quaxly"] }
];

const TYPE_BONUS_ITEM = {
  electric: "magnet",
  fire: "charcoal",
  grass: "miracleSeed",
  normal: "silkScarf",
  water: "mysticWater"
};

let starterObserver;
let starterPatchQueued = false;
let originalListHtml;
let originalMenuClassName;

UltraMods.define({
  id: MOD_ID,
  name: "All Starters",
  description: "Organizes every main starter option by generation on the Select a Starter screen.",
  image: "img/pkmn/sprite/bulbasaur.png",
  version: "1.4",
  author: "UltraPokechill",
  category: "Starter Select",
  hooks: {
    onToggle(api, payload) {
      if (payload.enabled) install(api);
      else cleanup();
    },
    onRefresh(api) {
      if (!api.isEnabled(MOD_ID)) return;
      install(api);
    }
  }
});

function install(api) {
  installStyles();
  patchStarterMenu(api);
  startObserver(api);
}

function installStyles() {
  if (document.getElementById("mod-all-starters-style")) return;

  const style = document.createElement("style");
  style.id = "mod-all-starters-style";
  style.textContent = `
    #starter-menu.mod-all-starters-menu {
      box-sizing: border-box;
      left: 50%;
      width: 50%;
      max-width: none;
      transform: translateX(-50%);
      align-items: center;
      padding: 1.7rem 0 2.5rem;
      gap: 0.9rem;
    }

    #starter-menu.mod-all-starters-menu .starter-list.mod-all-starters-list {
      width: min(94%, 54rem);
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(16.4rem, 1fr));
      gap: 0.8rem;
      justify-content: center;
      align-items: start;
    }

    #starter-menu.mod-all-starters-menu .mod-all-starters-group {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      padding: 0.45rem;
      border-radius: 0.5rem;
      background: rgba(236, 222, 183, 0.08);
      box-shadow: rgba(0, 0, 0, 0.18) 0 0.2rem 0.4rem inset;
    }

    #starter-menu.mod-all-starters-menu .mod-all-starters-group-title {
      width: 100%;
      min-height: 1.45rem;
      background: var(--light1);
      color: var(--light2);
      border: none;
      outline: none;
      border-radius: 0.3rem;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 0;
      font-size: 0.82rem;
      line-height: 1;
      text-align: center;
      cursor: default;
      transition: none;
    }

    #starter-menu.mod-all-starters-menu .mod-all-starters-row {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.45rem;
      background: transparent;
      color: inherit;
      border: none;
      outline: none;
      border-radius: 0;
      padding: 0;
      cursor: default;
      transition: none;
    }

    #starter-menu.mod-all-starters-menu .mod-all-starters-card {
      appearance: none;
      -webkit-appearance: none;
      min-height: 6.6rem;
      width: 100%;
      border: var(--light1) dashed 3px;
      outline: var(--light2) solid 3px;
      border-radius: 0.5rem;
      background: var(--light2);
      color: var(--dark2);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 0.05rem;
      padding: 0.25rem;
      font: inherit;
      text-align: center;
      line-height: 0.95;
      cursor: pointer;
      transition: transform 0.15s, filter 0.15s;
    }

    #starter-menu.mod-all-starters-menu .mod-all-starters-card:hover {
      transform: scale(1.04);
      filter: brightness(1.06);
    }

    #starter-menu.mod-all-starters-menu .mod-all-starters-card:active {
      transform: scale(0.98);
    }

    #starter-menu.mod-all-starters-menu .mod-all-starters-card img {
      width: 3.65rem;
      height: 3.65rem;
      object-fit: contain;
      image-rendering: pixelated;
      pointer-events: none;
    }

    #starter-menu.mod-all-starters-menu .mod-all-starters-card strong {
      max-width: 100%;
      overflow-wrap: anywhere;
      font-size: 0.8rem;
    }

    #starter-menu.mod-all-starters-menu .mod-all-starters-card small {
      color: var(--dark2);
      opacity: 0.78;
      font-size: 0.62rem;
      line-height: 1;
    }

    #starter-menu.mod-all-starters-menu #mod-all-starters-tip {
      padding: 0 1.4rem;
      max-width: min(92%, 46rem);
      box-sizing: border-box;
    }

    @media (min-width: 701px) and (max-width: 865px) {
      #starter-menu.mod-all-starters-menu .mod-all-starters-group:last-child:nth-child(odd) {
        grid-column: 1 / -1;
        width: min(100%, 16.4rem);
        justify-self: center;
      }
    }

    @media (max-width: 700px) {
      #starter-menu.mod-all-starters-menu {
        width: 100%;
        padding-top: 1.25rem;
      }

      #starter-menu.mod-all-starters-menu .starter-list.mod-all-starters-list {
        width: 94%;
        grid-template-columns: 1fr;
        gap: 0.7rem;
      }

      #starter-menu.mod-all-starters-menu .mod-all-starters-card {
        min-height: 6.2rem;
        padding: 0.3rem;
      }

      #starter-menu.mod-all-starters-menu .mod-all-starters-card img {
        width: 3.2rem;
        height: 3.2rem;
      }
    }

    @media (max-width: 1000px) {
      #starter-menu.mod-all-starters-menu {
        width: 100%;
      }
    }
  `;
  document.head.appendChild(style);
}

function startObserver(api) {
  if (starterObserver) return;

  starterObserver = new MutationObserver(() => {
    if (!api.isEnabled(MOD_ID)) return;
    queueStarterPatch(api);
  });

  starterObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style", "class"]
  });
}

function queueStarterPatch(api) {
  if (starterPatchQueued) return;
  starterPatchQueued = true;

  requestAnimationFrame(() => {
    starterPatchQueued = false;
    if (!api.isEnabled(MOD_ID)) return;
    patchStarterMenu(api);
  });
}

function patchStarterMenu(api) {
  const menu = document.getElementById("starter-menu");
  const list = menu?.querySelector(".starter-list");
  if (!menu || !list || !api.pkmn) return;
  if (list.dataset.allStartersReady === "true") return;

  if (originalListHtml === undefined) originalListHtml = list.innerHTML;
  if (originalMenuClassName === undefined) originalMenuClassName = menu.className;

  menu.classList.add("mod-all-starters-menu");
  list.classList.add("mod-all-starters-list");
  list.innerHTML = "";

  const fragment = document.createDocumentFragment();
  for (const group of STARTER_GROUPS) {
    const groupElement = createStarterGroup(api, group);
    if (groupElement) fragment.appendChild(groupElement);
  }

  list.appendChild(fragment);
  list.dataset.allStartersReady = "true";
  ensureTip(menu);
}

function createStarterGroup(api, group) {
  const validStarters = group.starters
    .map(id => ({ id, pokemon: api.pkmn[id] }))
    .filter(entry => entry.pokemon);
  if (validStarters.length === 0) return undefined;

  const section = document.createElement("section");
  section.className = "mod-all-starters-group";

  const title = document.createElement("div");
  title.className = "mod-all-starters-group-title";
  title.textContent = group.title;

  const row = document.createElement("div");
  row.className = "mod-all-starters-row";

  for (const entry of validStarters) {
    row.appendChild(createStarterCard(api, entry.id, entry.pokemon));
  }

  section.append(title, row);
  return section;
}

function createStarterCard(api, id, pokemon) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "mod-all-starters-card";
  card.dataset.pkmn = id;
  card.setAttribute("aria-label", `Choose ${api.formatName(id)}`);

  const sprite = document.createElement("img");
  sprite.src = `img/pkmn/sprite/${id}.png`;
  sprite.alt = "";

  const name = document.createElement("strong");
  name.textContent = api.formatName(id);

  const type = document.createElement("small");
  type.textContent = formatTypeLine(api, pokemon);

  card.append(sprite, name, type);
  card.addEventListener("click", () => chooseStarter(api, id, pokemon));

  return card;
}

function formatTypeLine(api, pokemon) {
  const types = (pokemon.type || []).filter(Boolean).map(type => api.formatName(type));
  if (types.length === 0) return "Unknown Type";
  return `${types.join(" / ")} Type`;
}

function chooseStarter(api, id, pokemon) {
  const menu = document.getElementById("starter-menu");
  if (menu) menu.style.pointerEvents = "none";

  const bonusItem = TYPE_BONUS_ITEM[pokemon.type?.[0]];
  if (bonusItem && api.item?.[bonusItem]) api.giveItem(bonusItem, 1);

  api.givePkmn(id, 10);
  api.refreshGame();
  closeStarterMenu(menu);
}

function closeStarterMenu(menu) {
  if (!menu) return;

  if (typeof voidAnimation === "function") {
    voidAnimation("starter-menu", "tooltipBoxAppear 0.2s 1 reverse");
  }

  setTimeout(() => {
    menu.style.display = "none";
    menu.style.pointerEvents = "";
  }, 150);
}

function ensureTip(menu) {
  let tip = document.getElementById("mod-all-starters-tip");
  if (!tip) {
    tip = document.createElement("span");
    tip.id = "mod-all-starters-tip";
    menu.appendChild(tip);
  }

  tip.textContent = "Tip: Right click (or long-press on mobile) on most elements for additional information";
}

function cleanup() {
  if (starterObserver) {
    starterObserver.disconnect();
    starterObserver = undefined;
  }
  starterPatchQueued = false;

  const menu = document.getElementById("starter-menu");
  const list = menu?.querySelector(".starter-list");

  if (list && originalListHtml !== undefined) {
    list.innerHTML = originalListHtml;
    list.classList.remove("mod-all-starters-list");
    delete list.dataset.allStartersReady;
  }

  if (menu && originalMenuClassName !== undefined) {
    menu.className = originalMenuClassName;
  } else if (menu) {
    menu.classList.remove("mod-all-starters-menu");
  }

  document.getElementById("mod-all-starters-tip")?.remove();
}
