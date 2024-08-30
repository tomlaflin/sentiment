import { RollType } from "../enums.mjs";

export class CustomRollData extends foundry.abstract.DataModel {
    static defineSchema() {
        return {
            rollType: new foundry.data.fields.StringField({
                initial: RollType.RollToDo
            }),
            formulaAddedToHit: new foundry.data.fields.StringField({
                initial: "+0"
            }),
            formulaAddedToEffect: new foundry.data.fields.StringField({
                initial: "+0"
            })
        };
    }
}