import AttributeData from "./documents/attribute.mjs";
import AttributeSheet from "./sheets/attribute-sheet.mjs";

Hooks.once("init", async function () {
    console.log(`Initializing Sentiment System`); 

    CONFIG.Item.dataModels.attribute = AttributeData;

    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("sentiment", AttributeSheet, { makeDefault: true });
});