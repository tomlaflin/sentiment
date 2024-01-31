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

    /** @inheritdoc */
    async getData(options) {
        const context = await super.getData(options);
        context.showCustomTokenImage = this.object.isEmbedded;

        return context;
    }
}
