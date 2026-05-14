const MOD_ID = "battleNumbers";

UltraMods.define({
  id: MOD_ID,
  name: "Battle Numbers",
  description: "Shows numeric HP, damage popups, and defeated unit counts in the battle summary.",
  image: "img/items/abilityCapsule.png",
  version: "1.3",
  author: "UltraPokechill",
  category: "Battle UI",
  hooks: {
    onToggle(api, payload, state) {
      if (!payload.enabled) cleanup();
      else {
        installSummaryStyles();
        normalizeSummaryState(state);
        removeDamageHosts();
        refreshTeam(api);
      }
    },
    onRefresh(api, payload, state) {
      if (!api.isEnabled(MOD_ID)) return;
      installSummaryStyles();
      normalizeSummaryState(state);
      removeDamageHosts();
      refreshWild(api);
      refreshTeam(api);
    },
    afterWildHpUpdate(api, payload) {
      updateWildReadout(api, payload);
    },
    afterTeamHpUpdate(api) {
      refreshTeam(api);
    },
    afterPlayerDamage(api, payload) {
      showDamage(api, getWildAnchor(), payload.damage, payload.type);
    },
    afterWildDamage(api, payload) {
      showDamage(api, document.getElementById(`explore-${payload.slot}-member`), payload.damage, payload.type);
    },
    onCombatStart(api, payload, state) {
      resetSummaryRun(state, payload.areaId);
    },
    afterEnemyDefeated(api, payload, state) {
      recordDefeat(api, payload, state);
    },
    afterBattleSummaryRender(api, payload, state) {
      renderSummaryDefeats(api, payload, state);
    }
  }
});

function cleanup() {
  document.querySelectorAll(".mod-hp-readout, .mod-damage-pop, .mod-battle-defeat-count").forEach(el => el.remove());
  document.getElementById("explore-header")?.classList.remove("mod-battle-numbers-active");
  document.querySelectorAll(".mod-damage-host, .mod-battle-numbers-member").forEach(el => {
    el.classList.remove("mod-damage-host");
    el.classList.remove("mod-battle-numbers-member");
  });
  document.querySelectorAll(".mod-battle-numbers-name-row").forEach(el => el.classList.remove("mod-battle-numbers-name-row"));
  document.querySelectorAll("[data-battle-numbers-defeat-slot]").forEach(el => {
    delete el.dataset.battleNumbersDefeatSlot;
    el.removeAttribute("title");
  });
}

function removeDamageHosts() {
  document.querySelectorAll(".mod-damage-host").forEach(el => el.classList.remove("mod-damage-host"));
}

function installSummaryStyles() {
  let style = document.getElementById("mod-battle-numbers-summary-style");
  if (!style) {
    style = document.createElement("style");
    style.id = "mod-battle-numbers-summary-style";
    document.head.appendChild(style);
  }

  style.textContent = `
    #battle-summary-flex .mod-battle-defeat-count {
      min-width: 5.8rem;
      margin-right: 0.5rem;
      border-radius: 0.25rem;
      background: var(--light1);
      color: var(--light2);
      display: inline-flex;
      justify-content: center;
      align-items: center;
      padding: 0.2rem 0.35rem;
      font-size: 0.78rem;
      line-height: 1;
      white-space: nowrap;
      flex-shrink: 0;
    }

    #battle-summary-flex [data-battle-numbers-defeat-slot] {
      cursor: help;
    }

    .mod-battle-defeat-details {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .mod-battle-defeat-details-row {
      width: 100%;
      min-height: 2.65rem;
      border-radius: 0.35rem;
      background: var(--dark1);
      color: var(--light2);
      display: flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.25rem 0.55rem;
    }

    .mod-battle-defeat-details-row img {
      width: 2.3rem;
      height: 2.3rem;
      object-fit: contain;
      image-rendering: pixelated;
      flex-shrink: 0;
    }

    .mod-battle-defeat-details-row strong {
      margin-left: auto;
      color: var(--accent);
      white-space: nowrap;
    }

    .mod-battle-defeat-empty {
      width: 100%;
      border-radius: 0.35rem;
      background: var(--dark1);
      color: var(--light2);
      text-align: center;
      padding: 0.8rem;
      opacity: 0.8;
    }

    .mod-battle-numbers-name-row {
      align-items: center;
      display: flex !important;
      flex-wrap: wrap;
      gap: 0.18rem 0.35rem;
      line-height: 1.1;
      max-width: 100%;
      min-width: 0;
      overflow: hidden;
      white-space: normal !important;
    }

    .mod-battle-numbers-name-row .explore-pkmn-level {
      flex: 0 0 auto;
      line-height: 1.05rem;
    }

    .explore-team-member.mod-battle-numbers-member {
      overflow: hidden !important;
    }

    .mod-hp-inline {
      color: var(--light2);
      flex: 0 1 auto;
      font-size: 0.84rem;
      font-variant-numeric: tabular-nums;
      line-height: 1.05rem;
      margin-left: 0 !important;
      max-width: 100%;
      min-width: 0;
      opacity: 0.95;
      overflow: hidden;
      text-overflow: ellipsis;
      vertical-align: middle;
      white-space: nowrap;
      z-index: 4;
    }

    #explore-header.mod-battle-numbers-active .explore-header-infobox,
    #explore-header.mod-battle-numbers-active .explore-header-hpbox,
    .mod-battle-numbers-member .explore-header-infobox,
    .mod-battle-numbers-member .explore-header-hpbox {
      min-width: 0;
      overflow: hidden;
    }

    #explore-header.mod-battle-numbers-active #explore-wild-sprite-data + .explore-header-infobox,
    .mod-battle-numbers-member .explore-header-infobox {
      flex: 1 1 auto;
      width: 0;
    }

    #explore-header.mod-battle-numbers-active .explore-header-hpbox,
    .mod-battle-numbers-member .explore-header-hpbox {
      white-space: normal;
    }

    .mod-damage-pop {
      max-width: calc(100vw - 1rem);
      overflow: hidden;
      text-overflow: ellipsis;
    }

    @media (max-width: 520px) {
      .mod-hp-inline {
        font-size: 0.68rem;
        line-height: 0.8rem;
      }

      #explore-header.mod-battle-numbers-active #explore-wild-name .mod-hp-inline,
      .mod-battle-numbers-member:not(.member-inactive) .mod-hp-inline {
        flex-basis: 100%;
      }

      .mod-battle-numbers-member .explore-header-hpbox {
        gap: 0.12rem;
        padding: 0.35rem;
      }

      .mod-battle-numbers-member .move-presets-level-control {
        flex-basis: 100%;
        margin-left: 0;
        max-width: 100%;
      }
    }
  `;
}

function refreshWild(api) {
  const state = api.getBattleState();
  if (state.wildHp === undefined || state.wildHpMax === undefined) return;
  updateWildReadout(api, { hp: state.wildHp, maxHp: state.wildHpMax });
}

function updateWildReadout(api, payload) {
  const label = document.getElementById("explore-wild-name");
  const level = label?.querySelector(".explore-pkmn-level");
  const text = formatHpText(api, payload.hp, payload.maxHp);

  if (label && level) {
    document.getElementById("explore-header")?.classList.add("mod-battle-numbers-active");
    const readout = ensureInlineReadout("mod-wild-hp-readout", level);
    setReadoutText(readout, text);
    return;
  }

  // Fallback to bar if name label not found (unlikely)
  const host = document.getElementById("exploe-wild-hp")?.parentElement;
  if (host) {
    const readout = ensureOldReadout(host, "mod-wild-hp-readout");
    setReadoutText(readout, text);
  }
}

function refreshTeam(api) {
  const state = api.getTeamState();

  for (const slot of ["slot1", "slot2", "slot3", "slot4", "slot5", "slot6"]) {
    const levelLabel = document.getElementById(`explore-${slot}-lvl`);
    const member = document.getElementById(`explore-${slot}-member`);
    const data = state[slot];

    if (!levelLabel || !data) {
      document.getElementById(`mod-${slot}-hp-readout`)?.remove();
      continue;
    }

    member?.classList.add("mod-battle-numbers-member");
    const readout = ensureInlineReadout(`mod-${slot}-hp-readout`, levelLabel);
    setReadoutText(readout, formatHpText(api, data.hp, data.hpMax));
  }
}

function ensureInlineReadout(id, anchor) {
  let readout = document.getElementById(id);
  if (!readout) {
    readout = document.createElement("span");
    readout.id = id;
    readout.className = "mod-hp-readout mod-hp-inline";
  }
  readout.removeAttribute("style");
  
  if (readout.parentElement !== anchor.parentElement) {
    anchor.insertAdjacentElement("afterend", readout);
  }
  anchor.parentElement?.classList.add("mod-battle-numbers-name-row");
  return readout;
}

function ensureOldReadout(host, id) {
  let readout = document.getElementById(id);
  if (!readout || readout.tagName !== "DIV") {
    readout?.remove();
    readout = document.createElement("div");
    readout.id = id;
    readout.className = "mod-hp-readout";
    host.appendChild(readout);
  }
  return readout;
}

function setReadoutText(readout, text) {
  readout.textContent = text.display;
  readout.title = text.full;
  readout.setAttribute("aria-label", text.full);
}

function formatHpText(api, hp, maxHp) {
  const full = `${api.formatNumber(hp)} / ${api.formatNumber(maxHp)} HP`;
  if (!isCompactBattleUi()) return { display: full, full };
  return {
    display: `${formatCompactHp(api, hp)} / ${formatCompactHp(api, maxHp)}`,
    full
  };
}

function isCompactBattleUi() {
  return window.matchMedia?.("(max-width: 520px)")?.matches || window.innerWidth <= 520;
}

function formatCompactHp(api, value) {
  const number = Number(value) || 0;
  const abs = Math.abs(number);
  if (abs < 10000) return api.formatNumber(value);

  const units = [
    { value: 1e12, suffix: "t" },
    { value: 1e9, suffix: "b" },
    { value: 1e6, suffix: "m" },
    { value: 1e3, suffix: "k" }
  ];
  const unit = units.find(entry => abs >= entry.value);
  if (!unit) return api.formatNumber(value);

  const scaled = number / unit.value;
  const decimals = Math.abs(scaled) >= 100 ? 0 : 1;
  return `${scaled.toFixed(decimals).replace(/\.0$/, "")}${unit.suffix}`;
}

function showDamage(api, anchor, damage, type) {
  const amount = Math.ceil(Number(damage) || 0);
  if (!anchor || amount <= 0) return;

  const rect = anchor.getBoundingClientRect();
  const popup = document.createElement("div");
  popup.className = "mod-damage-pop";
  popup.textContent = `-${api.formatNumber(amount)}`;
  popup.style.borderColor = api.typeColor(type);
  popup.style.left = `${clamp(rect.left + rect.width / 2, 28, window.innerWidth - 28)}px`;
  popup.style.top = `${clamp(Math.max(72, rect.top - 8), 28, window.innerHeight - 28)}px`;

  document.body.appendChild(popup);
  window.setTimeout(() => popup.remove(), 1400);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getWildAnchor() {
  return document.getElementById("explore-wild-sprite-data")
    || document.getElementById("exploe-wild-hp")?.parentElement;
}

function normalizeSummaryState(state) {
  if (!state.run || typeof state.run !== "object") {
    state.run = createEmptyRun();
  }
  if (!state.run.bySlot || typeof state.run.bySlot !== "object") {
    state.run.bySlot = {};
  }
  if (!Array.isArray(state.run.defeatKeys)) {
    state.run.defeatKeys = [];
  }
}

function createEmptyRun(areaId = undefined) {
  return {
    areaId,
    bySlot: {},
    defeatKeys: []
  };
}

function resetSummaryRun(state, areaId) {
  state.run = createEmptyRun(areaId);
}

function recordDefeat(api, payload, state) {
  normalizeSummaryState(state);

  const slot = payload.killerSlot;
  const playerId = payload.killerPokemonId || api.team?.[slot]?.pkmn?.id;
  const targetId = payload.targetPokemonId;
  if (!slot || !playerId || !targetId) return;

  const defeatKey = `${payload.areaId || "area"}:${payload.defeatIndex || state.run.defeatKeys.length + 1}`;
  if (state.run.defeatKeys.includes(defeatKey)) return;
  state.run.defeatKeys.push(defeatKey);

  if (!state.run.bySlot[slot]) {
    state.run.bySlot[slot] = {
      playerId,
      total: 0,
      byPokemon: {}
    };
  }

  const slotData = state.run.bySlot[slot];
  slotData.playerId = playerId;
  slotData.total = Math.max(0, Number(slotData.total) || 0) + 1;
  slotData.byPokemon[targetId] = Math.max(0, Number(slotData.byPokemon[targetId]) || 0) + 1;
}

function renderSummaryDefeats(api, payload, state) {
  normalizeSummaryState(state);
  installSummaryStyles();

  const container = payload.container || document.getElementById("battle-summary-flex");
  if (!container || !Array.isArray(payload.indexedTeam)) return;

  document.querySelectorAll(".mod-battle-defeat-count").forEach(el => el.remove());

  payload.indexedTeam.forEach((entry, index) => {
    const slot = entry.index;
    const row = container.children[index];
    if (!row) return;

    row.dataset.battleNumbersDefeatSlot = slot;
    row.title = "Right-click to view defeated Pokemon";

    const slotData = getSlotData(api, state, slot);
    const count = document.createElement("small");
    count.className = "mod-battle-defeat-count";
    count.textContent = `${slotData.total} ${slotData.total === 1 ? "unit" : "units"}`;
    row.appendChild(count);

    row.addEventListener("contextmenu", event => {
      event.preventDefault();
      event.stopPropagation();
      showDefeatDetails(api, slot, slotData);
    });
  });
}

function getSlotData(api, state, slot) {
  const existing = state.run.bySlot[slot];
  if (existing) return existing;

  return {
    playerId: api.team?.[slot]?.pkmn?.id,
    total: 0,
    byPokemon: {}
  };
}

function showDefeatDetails(api, slot, slotData) {
  const playerName = api.formatName(slotData.playerId || slot);
  const entries = Object.entries(slotData.byPokemon || {})
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count || api.formatName(a.id).localeCompare(api.formatName(b.id)));

  const title = document.getElementById("tooltipTitle");
  const top = document.getElementById("tooltipTop");
  const mid = document.getElementById("tooltipMid");
  const bottom = document.getElementById("tooltipBottom");

  if (!title || !mid || typeof window.openTooltip !== "function") return;

  if (top) top.style.display = "none";
  if (bottom) bottom.style.display = "none";
  title.style.display = "inline";
  title.textContent = `${playerName} defeated`;

  if (entries.length === 0) {
    mid.innerHTML = `<section class="mod-battle-defeat-empty">No defeated units in this battle.</section>`;
  } else {
    mid.innerHTML = `
      <section class="mod-battle-defeat-details">
        ${entries.map(entry => `
          <article class="mod-battle-defeat-details-row">
            <img src="img/pkmn/sprite/${entry.id}.png" alt="">
            <span>${api.formatName(entry.id)}</span>
            <strong>x${entry.count}</strong>
          </article>
        `).join("")}
      </section>
    `;
  }

  window.openTooltip();
}
