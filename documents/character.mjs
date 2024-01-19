export const AttributeIdNoSwing = "ATTRIBUTE_ID_NO_SWING";

export class CharacterData extends foundry.abstract.DataModel {
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
                    initial: AttributeIdNoSwing
                }),
                value: new foundry.data.fields.NumberField({
                    integer: true,
                    min: 0,
                    initial: 0
                })
            }),
            swingTokenImages: new foundry.data.fields.SchemaField({
                enabled: new foundry.data.fields.BooleanField({ initial: false }),
                defaultTokenImagePath: new foundry.data.fields.StringField({
                    initial: "icons/svg/mystery-man.svg"
                })
            })
        };
    }
}

/**
 * @extends {Actor}
 */
export class Character extends Actor {

    /** @inheritdoc */
    _onUpdate(changed, options, userId) {
        const newSwingAttributeId = changed.system?.swing?.attributeId;

        if (newSwingAttributeId && this.system.swingTokenImages.enabled && this.isToken) {
            const customTokenImagePath = newSwingAttributeId != AttributeIdNoSwing
                ? this.items.find((item) => item._id === newSwingAttributeId).system.customTokenImagePath
                : this.system.swingTokenImages.defaultTokenImagePath;

            this.token.update({ "texture.src": customTokenImagePath });
        }

        super._onUpdate(changed, options, userId);
    }
}