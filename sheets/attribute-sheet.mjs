export default class AttributeSheet extends ItemSheet {

    /** @inheritdoc */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["sentiment", "sheet"],
            template: "systems/sentiment/templates/attribute-sheet.html",
            width: 600,
            height: 600
        });
    }
    
    async getData(options) {
        const context = await super.getData(options);
        //context.systemData = context.data.system;
        return context;
    }
}
