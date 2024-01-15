export default class CharacterData extends foundry.abstract.DataModel {
    static defineSchema() {
        return {
            description: new foundry.data.fields.HTMLField(),
            health: new foundry.data.fields.SchemaField({
                value: new foundry.data.fields.NumberField({
                    integer: true,
                    initial: 10
                }),
                min: new foundry.data.fields.NumberField({
                    integer: true,
                    initial: 0
                }),
                max: new foundry.data.fields.NumberField({
                    integer: true,
                    initial: 10
                })
            }),
            speed: new foundry.data.fields.NumberField({
                integer: true,
                min: 0,
                initial: 30,
            }),
            experience: new foundry.data.fields.NumberField({
                integer: true,
                min: 0,
                initial: 0,
            }),
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