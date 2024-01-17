import { AttributeStatus } from "../enums.mjs";

export default class AttributeData extends foundry.abstract.DataModel {
    static defineSchema() {
        return {
            color: new foundry.data.fields.ArrayField(new foundry.data.fields.NumberField({
                min: 0,
                max: 1
            }), {
                initial: [1, 1, 1]
            }),
            modifier: new foundry.data.fields.NumberField({
                integer: true,
                initial: 0,
                min: 0
            }),
            status: new foundry.data.fields.NumberField({
                integer: true,
                initial: AttributeStatus.Normal
            }),
        };
    }
}