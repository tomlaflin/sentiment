import { RollType } from "../enums.mjs";

export class CustomRollData extends foundry.abstract.DataModel {
    static defineSchema() {
        return {
            rollType: new foundry.data.fields.StringField({
                initial: RollType.RollToDo
            }),
            formulaAddedToHit: new foundry.data.fields.StringField(),
            formulaAddedToEffect: new foundry.data.fields.StringField()
        };
    }
}