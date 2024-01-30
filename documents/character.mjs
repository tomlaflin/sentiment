import {
    AttributeStatus,
    RollType
} from "../enums.mjs";

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
            }),
            customRolls: new foundry.data.fields.ArrayField(new foundry.data.fields.SchemaField({
                name: new foundry.data.fields.StringField(),
                rollType: new foundry.data.fields.StringField({
                    initial: RollType.RollToDo
                }),
                formula: new foundry.data.fields.StringField()
            }))
        };
    }
}

/**
 * @extends {Actor}
 */
export class Character extends Actor {

    /**
    * Returns an array of the character's attributes, culled from the set of all owned items.
    */
    #getAttributes() {
        return this.items.filter((item) => item.type === "attribute");
    }

    /**
    * Returns the attribute associated with the character's current swing, or undefined if no matching attribute is found.
    */
    #getSwingAttribute() {
        return this.items.find((item) => item._id === this.system.swing.attributeId);
    }

    /**
    * Perform a Roll to Do and display the result as a chat message.
    * @param additionalDiceFormula
    */
    async rollToDo(additionalDiceFormula) {
        const swingAttribute = this.#getSwingAttribute();
        const swingValue = this.system.swing.value;

        const d20Roll = await new Roll("1d20").evaluate();
        let templatePath = "systems/sentiment/templates/rolls/";
        let templateValues = {
            d20Roll: d20Roll.total,
            total: d20Roll.total
        };

        if (additionalDiceFormula) {
            const additionalDiceRoll = await new Roll(additionalDiceFormula).evaluate();
            templateValues.additionalDice = additionalDiceRoll;
            templateValues.total += additionalDiceRoll.total;
        }

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

        return this.#renderToChatMessage(templatePath, templateValues);
    }

    /**
    * Render a dialog allowing the user to choose which attribute they wish to use for a Roll to Do.
    * @private
    */
    async #renderRollToDoChooseAttributeDialog() {
        const attributes = this.#getAttributes();
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

    /**
    * Perform a Roll to Dye and display the result as a chat message.
    * @param additionalDiceFormula
    */
    async rollToDye(additionalDiceFormula) {
        const rollToDyeOptions = {
            rollTitle: "Roll to Dye",
            totalStrategy: this.#totalAllAttributeRollsAndOnlySwingModifier,
        }

        this.#rollToDyeImpl(rollToDyeOptions, additionalDiceFormula);
    }

    /**
    * Perform a Recovery Roll and display the result as a chat message.
    * @param additionalDiceFormula
    */
    async recoveryRoll(additionalDiceFormula) {
        const rollToDyeOptions = {
            rollTitle: "Recovery Roll",
            totalStrategy: this.#totalAllAttributeRollsAndModifiers,
        }
        const rollToDyeTotal = await this.#rollToDyeImpl(rollToDyeOptions, additionalDiceFormula);
        const newHealth = Math.min(this.system.health.value + rollToDyeTotal, this.system.health.max);

        return this.update({
            "system.health.value": newHealth
        });
    }

    /**
    * Total attribute dice, but only add the modifier of the swing die.
    * @param attributeDice
    * @param swingAttributeDie
    * @private
    */
    #totalAllAttributeRollsAndOnlySwingModifier(attributeDice, swingAttributeDie) {
        let total = attributeDice.reduce((total, attributeDie) => total + attributeDie.roll, 0);
        total += swingAttributeDie?.attribute.system.modifier ?? 0;
        return total;
    }

    /**
    * Total attribute dice including the modifier of each die. The swing die is not treated specially.
    * @param attributeDice
    * @param swingAttributeDie
    * @private
    */
    #totalAllAttributeRollsAndModifiers(attributeDice, swingAttributeDie) {
        return attributeDice.reduce((total, attributeDie) => total + attributeDie.roll + attributeDie.attribute.system.modifier, 0);
    }

    /**
    * Common implementation of Roll to Dye. Scenario-specific parameters are injected via an options object.
    * @param options
    * @param additionalDiceFormula
    * @private
    */
    async #rollToDyeImpl(options, additionalDiceFormula) {
        const swingAttribute = this.#getSwingAttribute();
        const swingValue = this.system.swing.value;
        const existingSwingAttributeDie = swingAttribute ? {
            attribute: swingAttribute,
            roll: swingValue - swingAttribute.system.modifier,
            existing: true
        } : null;

        const attributeDice = await this.#rollAttributeDice(existingSwingAttributeDie);
        const additionalDice = additionalDiceFormula ? await new Roll(additionalDiceFormula).evaluate() : null;
        await this.#renderAttributeDice(options.rollTitle, attributeDice, additionalDice);

        const availableAttributeDice = attributeDice.filter((attributeDie) => attributeDie.attribute.system.status == AttributeStatus.Normal);
        this.#releaseAttributesFromLockout();

        const chosenAttributeDie = availableAttributeDice.length > 0 ? await this.#renderChooseSwingDialog(options.rollTitle, availableAttributeDice) : null;
        if (chosenAttributeDie != null) {
            this.update({
                "system.swing.attributeId": chosenAttributeDie.attribute._id,
                "system.swing.value": chosenAttributeDie.roll + chosenAttributeDie.attribute.system.modifier
            });
        }
        
        const newSwingAttributeDie = chosenAttributeDie ?? existingSwingAttributeDie;
        const rollToDyeTotal = options.totalStrategy(availableAttributeDice, newSwingAttributeDie) + (additionalDice ? additionalDice.total : 0);
        this.#renderRollToDyeResult(options.rollTitle, rollToDyeTotal, newSwingAttributeDie);

        return rollToDyeTotal;
    }

    /**
    * Roll a d6 associated with each of the character's attributes. The character's existing swing attribute, if any, is retained at its current value.
    * @param swingAttributeDie
    * @private
    */
    async #rollAttributeDice(swingAttributeDie) {
        let attributeDice = [];

        const attributes = this.#getAttributes();
        for (const attribute of attributes) {
            if (attribute._id == swingAttributeDie?.attribute._id) {
                attributeDice.push(swingAttributeDie);
            }
            else {
                const d6Roll = await new Roll("1d6").evaluate();
                attributeDice.push({
                    attribute: attribute,
                    roll: d6Roll.total,
                    existing: false
                });
            }
        }

        return attributeDice;
    }

    /**
    * Render a chat message announcing the character's rolls on their attribute dice.
    * @param rollTitle
    * @param attributeDice
    * @param additionalDice
    * @private
    */
    async #renderAttributeDice(rollTitle, attributeDice, additionalDice) {
        const templatePath = "systems/sentiment/templates/rolls/roll-to-dye-dice.html";
        return this.#renderToChatMessage(templatePath, {
            title: rollTitle,
            attributeDice: attributeDice,
            additionalDice: additionalDice
        });
    }

    /**
    * Restore all locked-out attributes to normal status.
    * @private
    */
    #releaseAttributesFromLockout() {
        this.#getAttributes().filter((attribute) => attribute.system.status === AttributeStatus.LockedOut).forEach((lockedOutAttribute) =>
            lockedOutAttribute.update({ "system.status": AttributeStatus.Normal })
        );
    }

    /**
    * Render a dialog allowing the user to choose a new swing for the character based on the results of their Roll to Dye.
    * @param dialogTitle
    * @param attributeDice
    * @private
    */
    async #renderChooseSwingDialog(dialogTitle, attributeDice) {
        const contentTemplatePath = "systems/sentiment/templates/rolls/roll-to-dye-choose-swing.html";
        const content = await renderTemplate(contentTemplatePath, {});

        return new Promise((resolve, reject) => {
            let buttons = {};

            for (let attributeDie of attributeDice) {
                const swingValue = attributeDie.roll + attributeDie.attribute.system.modifier;
                buttons[attributeDie.attribute._id] = {
                    label: attributeDie.attribute.name + ": " + swingValue,
                    callback: () => { resolve(attributeDie) }
                }
            }

            const chooseSwingDialog = {
                title: dialogTitle,
                content: content,
                buttons: buttons,
                close: () => { resolve(null) }
            };

            new Dialog(chooseSwingDialog).render(true);
        });
    }

    /**
    * Render a chat message announcing the final result of the character's Roll to Dye including their chosen swing, if any.
    * @param rollTitle
    * @param total
    * @param swingAttributeDie
    * @private
    */
    async #renderRollToDyeResult(rollTitle, total, swingAttributeDie) {
        let templatePath = "systems/sentiment/templates/rolls/";
        let templateValues = {
            title: rollTitle,
            total: total
        };

        if (swingAttributeDie === null) {
            templatePath += "roll-to-dye-result-no-swing.html";
        }
        else {
            templatePath += "roll-to-dye-result-swing.html";
            templateValues.swingAttributeName = swingAttributeDie.attribute.name;
            templateValues.swingValue = swingAttributeDie.roll + swingAttributeDie.attribute.system.modifier;
        }

        return this.#renderToChatMessage(templatePath, templateValues);
    }

    /**
    * Drop the character's swing, if any.
    */
    async dropSwing() {
        if (this.system.swing.attributeId === AttributeIdNoSwing) {
            return;
        }

        this.update({
            "system.swing.attributeId": AttributeIdNoSwing,
            "system.swing.value": 0
        });

        const templatePath = "systems/sentiment/templates/rolls/drop-swing.html";
        return this.#renderToChatMessage(templatePath, {});
    }

    /**
    * Restore the specified attribute.
    * @param attributeId
    */
    restoreAttribute(attributeId) {
        const attribute = this.items.find((item) => item._id === attributeId);
        attribute.update({ "system.status": AttributeStatus.Normal });
    }

    /**
    * Lock out the specified attribute.
    * @param attributeId
    */
    lockOutAttribute(attributeId) {
        const attribute = this.items.find((item) => item._id === attributeId);
        attribute.update({ "system.status": AttributeStatus.LockedOut });

        if (attributeId === this.system.swing.attributeId) {
            this.dropSwing();
        }
    }

    /**
    * Wound the specified attribute.
    * @param attributeId
    */
    woundAttribute(attributeId) {
        const attribute = this.items.find((item) => item._id === attributeId);
        attribute.update({ "system.status": AttributeStatus.Wounded });

        if (attributeId === this.system.swing.attributeId) {
            this.dropSwing();
        }
    }

    /**
    * Add a new custom roll at the end of the list.
    */
    async addCustomRoll() {
        const newCustomRoll = {
            name: "New Custom Roll",
            rollType: RollType.RollToDo,
            formula: ""
        };

        let customRolls = this.system.customRolls;
        customRolls.push(newCustomRoll);
        return this.update({ "system.customRolls": customRolls });
    }

    /**
    * Delete the custom roll at the specified index.
    * @param index
    */
    async deleteCustomRoll(index) {
        let customRolls = this.system.customRolls;
        customRolls.splice(index, 1);
        return this.update({ "system.customRolls": customRolls });
    }

    /**
    * Executes the custom roll at the specified index.
    * @param index
    */
    async executeCustomRoll(index) {
        const customRoll = this.system.customRolls[index];
        if (!customRoll) {
            throw new Error("Attempting to execute undefined custom roll at index " + index);
        }

        switch (customRoll.rollType) {
            case RollType.RollToDo:
                return this.rollToDo(customRoll.formula);
            case RollType.RollToDye:
                return this.rollToDye(customRoll.formula);
            case RollType.RecoveryRoll:
                return this.recoveryRoll(customRoll.formula);
            default:
                throw new Error("Unknown RollType " + customRoll.RollType + " on custom roll at index " + index);
        }
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