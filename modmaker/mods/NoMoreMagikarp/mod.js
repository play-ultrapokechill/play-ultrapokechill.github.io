const MOD_ID = "noMoreMagikarp";
const PATCH_KEY = "__noMoreMagikarpAssignPatch";

const FIXES = [
  {
    blueprint: "dimensionKyuremWhite",
    raid: "dimensionRaid3",
    pokemon: "kyuremWhite"
  },
  {
    blueprint: "dimensionMegaRayquaza",
    raid: "dimensionRaid4",
    pokemon: "megaRayquaza"
  }
];

const runtime = {
  api: undefined,
  originalRewards: {}
};

UltraMods.define({
  id: MOD_ID,
  name: "No More Magikarp",
  description: "Fixes Mega-Dimension rewards so White Kyurem and M-Rayquaza reward their actual Pokemon instead of Magikarp.",
  image: "icon.png",
  version: "1.0",
  author: "UltraPokechill",
  category: "Battle",
  hooks: {
    onToggle(api, payload) {
      runtime.api = api;
      if (payload.enabled) install(api);
      else uninstall(api);
    },
    onRefresh(api) {
      runtime.api = api;
      if (api.isEnabled(MOD_ID)) install(api);
    },
    onCombatStart(api) {
      if (api.isEnabled(MOD_ID)) applyRewards(api);
    },
    afterEnemyDefeated(api) {
      if (api.isEnabled(MOD_ID)) applyRewards(api);
    }
  }
});

function install(api) {
  runtime.api = api;
  patchAssignMegaDimension();
  applyRewards(api);
}

function uninstall(api) {
  restoreAssignMegaDimension();
  restoreRewards(api || runtime.api);
}

function applyRewards(api = runtime.api) {
  const areaMap = getAreas();
  const pokemonMap = api?.pkmn || getPokemonDictionary();
  if (!areaMap || !pokemonMap) return false;

  let changed = false;
  for (const fix of FIXES) {
    const target = pokemonMap[fix.pokemon];
    if (!target) continue;

    changed = patchAreaReward(areaMap, fix.blueprint, target) || changed;

    const raid = areaMap[fix.raid];
    if (isActiveTargetRaid(raid, target)) {
      changed = patchAreaReward(areaMap, fix.raid, target) || changed;
    }
  }

  return changed;
}

function patchAreaReward(areaMap, areaId, targetPokemon) {
  const area = areaMap?.[areaId];
  if (!area) return false;
  if (!Array.isArray(area.reward)) area.reward = [];

  rememberOriginalReward(areaId, area.reward);

  let changed = false;
  const nextReward = area.reward.map(reward => {
    if (reward?.id !== "magikarp") return reward;
    changed = true;
    return targetPokemon;
  });

  if (!nextReward.some(reward => reward?.id === targetPokemon.id)) {
    nextReward.unshift(targetPokemon);
    changed = true;
  }

  if (changed) area.reward = nextReward;
  return changed;
}

function rememberOriginalReward(areaId, reward) {
  if (runtime.originalRewards[areaId]) return;
  runtime.originalRewards[areaId] = Array.isArray(reward) ? [...reward] : [];
}

function restoreRewards(api = runtime.api) {
  const areaMap = getAreas();
  if (!areaMap) return;

  for (const fix of FIXES) {
    for (const areaId of [fix.blueprint, fix.raid]) {
      const area = areaMap[areaId];
      const original = runtime.originalRewards[areaId];
      if (!area || !original) continue;
      if (!Array.isArray(area.reward) || !area.reward.some(reward => reward?.id === fix.pokemon)) continue;
      area.reward = [...original];
    }
  }

  runtime.originalRewards = {};
}

function isActiveTargetRaid(area, targetPokemon) {
  if (!area || !targetPokemon) return false;
  return area.icon === targetPokemon || area.team?.slot1 === targetPokemon;
}

function patchAssignMegaDimension() {
  const original = getAssignMegaDimension();
  if (typeof original !== "function" || original[PATCH_KEY]) return;

  const patched = function noMoreMagikarpAssignMegaDimension(...args) {
    const result = original.apply(this, args);
    applyRewards(runtime.api);
    return result;
  };

  patched[PATCH_KEY] = true;
  patched.__noMoreMagikarpOriginal = original;
  setAssignMegaDimension(patched);
}

function restoreAssignMegaDimension() {
  const current = getAssignMegaDimension();
  const original = current?.__noMoreMagikarpOriginal;
  if (typeof original === "function" && current?.[PATCH_KEY]) {
    setAssignMegaDimension(original);
  }
}

function getAssignMegaDimension() {
  try {
    return typeof assignMegaDimension === "undefined" ? window.assignMegaDimension : assignMegaDimension;
  } catch (error) {
    return window.assignMegaDimension;
  }
}

function setAssignMegaDimension(fn) {
  try {
    assignMegaDimension = fn;
  } catch (error) {}
  window.assignMegaDimension = fn;
}

function getAreas() {
  try {
    return typeof areas === "undefined" ? window.areas : areas;
  } catch (error) {
    return window.areas;
  }
}

function getPokemonDictionary() {
  try {
    return typeof pkmn === "undefined" ? window.pkmn : pkmn;
  } catch (error) {
    return window.pkmn;
  }
}

window.NoMoreMagikarp = {
  apply: () => applyRewards(runtime.api)
};
