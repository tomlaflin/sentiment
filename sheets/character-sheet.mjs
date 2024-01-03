export default class CharacterSheet extends ActorSheet {

    /** @inheritdoc */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["sentiment", "sheet"],
            template: "systems/sentiment/templates/character-sheet.html",
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }],
        });
    }
    
    /** @inheritdoc */
    async getData(options) {
        const context = await super.getData(options);
        context.descriptionHTML = await TextEditor.enrichHTML(context.data.system.description, {
            secrets: this.document.isOwner,
            async: true
        });
        return context;
    }
}
