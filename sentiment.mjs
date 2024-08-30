import {
    AttributeData,
    Attribute
} from "./documents/attribute.mjs";
import AttributeSheet from "./sheets/attribute-sheet.mjs";

import { GiftData } from "./documents/gift.mjs";
import GiftSheet from "./sheets/gift-sheet.mjs";

import {
    CharacterData,
    Character
} from "./documents/character.mjs";
import CharacterSheet from "./sheets/character-sheet.mjs";

import { CustomRollData } from "./documents/custom-roll.mjs";
import CustomRollSheet from "./sheets/custom-roll-sheet.mjs";

import tryCreateCharacterMacro from "./macro.mjs"


Hooks.once("init", async function () {
    console.log(`Initializing Sentiment System`); 

    CONFIG.Item.dataModels.attribute = AttributeData;
    CONFIG.Item.dataModels.gift = GiftData;
    CONFIG.Item.dataModels.customRoll = CustomRollData;
    CONFIG.Actor.dataModels.character = CharacterData;

    CONFIG.Actor.documentClass = Character;

    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("sentiment", AttributeSheet, {
        types: ["attribute"],
        makeDefault: true,
        label: "Attribute Sheet"
    });
    Items.registerSheet("sentiment", GiftSheet, {
        types: ["gift"],
        makeDefault: true,
        label: "Gift Sheet"
    });
    Items.registerSheet("sentiment", CustomRollSheet, {
        types: ["customRoll"],
        makeDefault: true,
        label: "Custom Roll Sheet"
    });

    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("sentiment", CharacterSheet, {
        types: ["character"],
        makeDefault: true,
        label: "Character Sheet"
    });

    Attribute.RegisterHandlebarsHelpers();
    Character.RegisterHandlebarsHelpers();
    CharacterSheet.RegisterHandlebarsHelpers();

    await loadTemplates(["systems/sentiment/templates/partials/gift-list.html"]);
});

Hooks.on("hotbarDrop", (bar, data, slot) => tryCreateCharacterMacro(data, slot));