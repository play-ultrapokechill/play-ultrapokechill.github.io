const fs = require("fs");

let code = fs.readFileSync("scripts/pkmnDictionary.js", "utf8");

let count = 0;
let wip = 0;
let wipNames = [];

let blocks = code.split("pkmn.");
for (let b of blocks) {
    if (!b.includes("=") || !b.includes("{")) continue;
    let name = b.substring(0, b.indexOf(" "));
    let objCode = b.substring(b.indexOf("{"), b.length);
    
    // Some blocks are not just single pkmn, so we take until the first "\n}"
    let end = objCode.indexOf("\n}");
    if (end > -1) {
        let pkmnBlock = objCode.substring(0, end + 2);
        count++;
        if (!pkmnBlock.includes("hiddenAbility:")) {
            wip++;
            wipNames.push(name.trim());
        }
    }
}

console.log("Total Pkmn Parsed:", count);
console.log("Total WIP HA Pkmn:", wip);
fs.writeFileSync("tmp/wip_pokemon.txt", wipNames.join(", "));
