const MOD_ID = "cosmoemEvolveSimple";

UltraMods.define({
  id: MOD_ID,
  name: "Cosmoem Evolution (Simple)",
  description: "Makes Cosmoem evolve at level 53 (Solgaleo during day, Lunala during night).",
  version: "1.0",
  author: "Antigravity",
  category: "Evolution",
  hooks: {
    onToggle(api, payload) {
      if (payload.enabled) patchEvolution(api);
      else unpatchEvolution(api);
    },
    onRefresh(api) {
      if (api.isEnabled(MOD_ID)) patchEvolution(api);
    }
  }
});

function patchEvolution(api) {
  if (!api.pkmn || !api.pkmn.cosmoem) return;

  api.pkmn.cosmoem.evolve = function() {
    const hour = new Date().getHours();
    const isDay = hour >= 6 && hour < 18;
    const evolution = isDay ? api.pkmn.solgaleo : api.pkmn.lunala;
    
    return { 
      1: { pkmn: evolution, level: 53 } 
    };
  };
}

function unpatchEvolution(api) {
  if (api.pkmn && api.pkmn.cosmoem) {
    // Restaurar ao estado original (sem evolução ou o que estava antes)
    delete api.pkmn.cosmoem.evolve;
  }
}
