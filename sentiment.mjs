import AttributeData from "./documents/attribute.mjs";
import AttributeSheet from "./sheets/attribute-sheet.mjs";

import GiftData from "./documents/gift.mjs";
import GiftSheet from "./sheets/gift-sheet.mjs";

import CharacterData from "./documents/character.mjs";
import CharacterSheet from "./sheets/character-sheet.mjs";

Hooks.once("init", async function () {
    console.log(`Initializing Sentiment System`); 

    CONFIG.Item.dataModels.attribute = AttributeData;
    CONFIG.Item.dataModels.gift = GiftData;

    CONFIG.Actor.dataModels.character = CharacterData;

    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("sentiment", AttributeSheet, { makeDefault: true });
    Items.registerSheet("sentiment", GiftSheet, { makeDefault: true });

    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("sentiment", CharacterSheet, { makeDefault: true });

    CharacterSheet.RegisterHandlebarsHelpers();

    await loadTemplates(["systems/sentiment/templates/partials/gift-list.html"]);
});