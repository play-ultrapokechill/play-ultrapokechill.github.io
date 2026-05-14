const MOD_ID = "fatigueRemover";
const ACTIVE_KEY = "__ultraFatigueRemoverActive";
const PATCH_KEY = "__ultraFatigueRemoverPatch";
const ORIGINAL_KEY = "__ultraFatigueRemoverOriginalExploreCombatPlayer";
const TARGET_LINE = "attacker.playerHp -= fatigueDamage";

UltraMods.define({
  id: MOD_ID,
  name: "Fatigue Remover",
  description: "Removes Battle Fatigue HP loss completely while enabled.",
  image: "img/items/leftovers.png",
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
  window[ACTIVE_KEY] = true;
  patchExploreCombatPlayer();
}

function uninstall() {
  window[ACTIVE_KEY] = false;
  restoreExploreCombatPlayer();
}

function patchExploreCombatPlayer() {
  const current = getExploreCombatPlayer();
  if (typeof current !== "function") {
    console.warn("[Fatigue Remover] exploreCombatPlayer was not found.");
    return false;
  }

  if (current[PATCH_KEY]) return true;

  const source = Function.prototype.toString.call(current);
  const matches = source.split(TARGET_LINE).length - 1;
  if (matches !== 1) {
    console.warn("[Fatigue Remover] Could not find the Battle Fatigue HP line to patch.");
    return false;
  }

  const replacement = `if (!window["${ACTIVE_KEY}"]) {\n        ${TARGET_LINE}\n        }`;
  let patched;

  try {
    patched = new Function(`return (${source.replace(TARGET_LINE, replacement)});`)();
  } catch (error) {
    console.warn("[Fatigue Remover] Failed to patch exploreCombatPlayer.", error);
    return false;
  }

  patched[PATCH_KEY] = true;
  patched.__fatigueRemoverOriginal = current;
  window[ORIGINAL_KEY] = current;
  setExploreCombatPlayer(patched);
  return true;
}

function restoreExploreCombatPlayer() {
  const original = window[ORIGINAL_KEY];
  const current = getExploreCombatPlayer();
  if (typeof original === "function" && current?.[PATCH_KEY]) {
    setExploreCombatPlayer(original);
  }
  delete window[ORIGINAL_KEY];
}

function getExploreCombatPlayer() {
  try {
    return typeof exploreCombatPlayer === "undefined" ? window.exploreCombatPlayer : exploreCombatPlayer;
  } catch (error) {
    return window.exploreCombatPlayer;
  }
}

function setExploreCombatPlayer(fn) {
  try {
    exploreCombatPlayer = fn;
  } catch (error) {}
  window.exploreCombatPlayer = fn;
}
