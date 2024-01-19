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
        const colorRGB = context.data.system.color;
        context.colorString = foundry.utils.Color.fromRGB(colorRGB).toString();
        
        context.showCustomTokenImage = this.object.isEmbedded;

        return context;
    }

    /** @inheritdoc */
    async _updateObject(event, formData) {
        const colorString = formData[`colorPicker`];
        const colorRGB = foundry.utils.Color.fromString(colorString).rgb;
        await this.object.update({ "system.color": colorRGB }, {});

        return super._updateObject(event, formData);
    }
}
