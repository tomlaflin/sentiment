export const AttributeIdNoSwing = "ATTRIBUTE_ID_NO_SWING";
import { AttributeStatus } from "../enums.mjs";

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

    /**
    * Perform a Roll to Do and display the result as a chat message.
    */
    async rollToDo() {
        const swingAttribute = this.items.find((item) => item._id === this.system.swing.attributeId);
        const swingValue = this.system.swing.value;
        
        const d20Roll = await new Roll("1d20").evaluate();
        let templatePath = "systems/sentiment/templates/rolls/";
        let templateValues = {
            d20Roll: d20Roll.total,
            total: d20Roll.total
        };
        
        if (swingAttribute) {
            templatePath += "roll-to-do-swing.html";
        
            templateValues.swingValue = swingValue;
            templateValues.swingAttribute = swingAttribute.name;
            templateValues.total += swingValue;
        }
        else {
            templatePath += "roll-to-do-no-swing.html";
        
            const d6Roll = await new Roll("1d6").evaluate();
            templateValues.d6Roll = d6Roll.total;
            templateValues.total += d6Roll.total;
        
            let dialogCanceled = false;
            const chosenAttribute = await this.#renderRollToDoChooseAttributeDialog().catch(() => {
                dialogCanceled = true;
            });

            if (dialogCanceled) {
                return;
            }
        
            templateValues.attribute = chosenAttribute;
            templateValues.total += chosenAttribute?.system.modifier ?? 0;
        }
        
        this.#renderToChatMessage(templatePath, templateValues);
    }

    /**
    * Render a dialog allowing the user to choose which attribute they wish to use for a Roll to Do.
    * @private
    */
    async #renderRollToDoChooseAttributeDialog() {
        const attributes = this.items.filter((item) => item.type === "attribute");
        const contentTemplatePath = "systems/sentiment/templates/rolls/roll-to-do-choose-attribute.html";
        const content = await renderTemplate(contentTemplatePath, {});

        return new Promise((resolve, reject) => {
            let buttons = {};
            
            attributes.filter((attribute) => attribute.system.status == AttributeStatus.Normal).forEach((attribute) =>
                buttons[attribute._id] = {
                    label: attribute.name + " (+" + attribute.system.modifier + ")",
                    callback: () => { resolve(attribute) }
                }
            );

            buttons.wild = {
                label: "Wild",
                callback: () => { resolve(null) }
            }

            const chooseAttributeDialog = {
                title: "Roll To Do",
                content: content,
                buttons: buttons,
                close: () => { reject() }
            };
            
            new Dialog(chooseAttributeDialog).render(true);
        });
    }

    /**
    * Render an HTML template with arguments as a chat message with this character as the speaker.
    * @param templatePath
    * @param args
    * @private
    */
    async #renderToChatMessage(templatePath, args) {
        const html = await renderTemplate(templatePath, args);
        let message = {
            speaker: {
                alias: this.name
            },
            content: html
        };

        return ChatMessage.create(message);
    }

    /** @inheritdoc */
    _onUpdate(changed, options, userId) {
        const newSwingAttributeId = changed.system?.swing?.attributeId;

        if (newSwingAttributeId && this.system.swingTokenImages.enabled) {
            const customTokenImagePath = newSwingAttributeId != AttributeIdNoSwing
                ? this.items.find((item) => item._id === newSwingAttributeId).system.customTokenImagePath
                : this.system.swingTokenImages.defaultTokenImagePath;

            const targetTokens = [];

            if (this.isToken) {
                targetTokens.push(this.token);
            }
            else {
                targetTokens.push(this.prototypeToken);
                this.getDependentTokens().filter((token) => token.actorLink).forEach((token) => targetTokens.push(token));
            }

            targetTokens.forEach((token) => token.update({ "texture.src": customTokenImagePath }));
        }

        super._onUpdate(changed, options, userId);
    }
}