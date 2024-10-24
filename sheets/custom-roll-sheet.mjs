import { RollTypes } from "../enums.mjs";

export default class CustomRollSheet extends ItemSheet {

    /** @inheritdoc */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["sentiment", "sheet", "custom-roll"],
            template: "systems/sentiment/templates/custom-roll-sheet.html"
        });
    }

    /** @inheritdoc */
    async getData(options) {
        const context = await super.getData(options);

        context.rollTypeOptions = {};
        Object.keys(RollTypes).forEach((rollType) => {
            context.rollTypeOptions[rollType] = RollTypes[rollType].DisplayName;
        });

        context.showToHit = context.data.system.rollType === "RollToDo";

        return context;
    }
}
