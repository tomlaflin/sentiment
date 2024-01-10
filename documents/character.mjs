import AttributeData from "./attribute.mjs";

export default class CharacterData extends foundry.abstract.DataModel {
    static defineSchema() {
        return {
            description: new foundry.data.fields.HTMLField(),
            swing: new foundry.data.fields.SchemaField({
                attributeId: new foundry.data.fields.StringField({
                    nullable: true,
                    initial: null
                }),
                value: new foundry.data.fields.NumberField({
                    integer: true,
                    min: 0,
                    initial: 0
                })
            })
        };
    }
}