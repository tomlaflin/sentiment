export default class CharacterSheet extends ActorSheet {

    #attributes;
    #swingAttribute;
    #swingValue;

    /** @inheritdoc */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["sentiment", "sheet"],
            template: "systems/sentiment/templates/character-sheet.html",
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }],
        });
    }
    
    /** @inheritdoc */
    async getData(options) {
        const context = await super.getData(options);

        await this.#populateDescription(context);
        this.#populateAttributes(context);
        this.#cacheSwing(context);

        return context;
    }

    /**
    * Transform the raw description property into enriched HTML and embed it into the context for easy access.
    * @param context
    * @private
    */
    async #populateDescription(context) {
        context.descriptionHTML = await TextEditor.enrichHTML(context.data.system.description, {
            secrets: this.document.isOwner,
            async: true
        });
    }

    /**
    * Iterate all owned items and embed a collection containing only the attributes into the context for easy access.
    * @param context
    * @private
    */
    #populateAttributes(context) {
        this.#attributes = [];
        for (let item of context.items) {
            if (item.type == "attribute") {
                this.#attributes.push(item);
            }
        }

        context.attributes = this.#attributes;
    }

    /**
    * Find the properties associated with the character's current swing, if any, and cache them for reference after the form is rendered.
    * @param context
    * @private
    */
    #cacheSwing(context) {
        const swingAttribute = context.attributes.find((attribute) => attribute._id == context.data.system.swing.attributeId);
        this.#swingAttribute = swingAttribute ?? null;
        this.#swingValue = swingAttribute ? context.data.system.swing.value : 0;
    }

    /** @inheritdoc */
    async _updateObject(event, formData) {
        await this.object.update({ "system.swing.attributeId": formData[`swing-attribute-selector`] }, {});

        return super._updateObject(event, formData);
    }

    /** @inheritdoc */
    activateListeners(html) {
        super.activateListeners(html);

        this.#updateSwingControls();
        html.find('.attribute-open').click(this.#onAttributeOpen.bind(this));

        if (!this.isEditable) {
            return;
        }

        html.find(".attribute-add").click(this.#onAttributeAdd.bind(this));
        html.find(".attribute-delete").click(this.#onAttributeDelete.bind(this));
        html.find(".roll-to-do").click(this.#onRollToDo.bind(this));
        html.find(".roll-to-dye").click(this.#onRollToDye.bind(this));
    }

    /**
    * Set value and display for the swing controls based on the cached swingAttributeId.
    * @private
    */
    #updateSwingControls() {
        this.form.querySelector(".swing-attribute-selector").value = this.#swingAttribute?._id ?? null;

        const swingValueInput = this.form.querySelector(".swing-value");
        swingValueInput.style.display = this.#swingAttribute ? "flex" : "none";
        swingValueInput.value = this.#swingValue;
    }

    /**
    * Handle event when the user adds an attribute.
    * @param event
    * @private
    */
    async #onAttributeAdd(event) {
        event.preventDefault();
        
        const itemData = {
            name: "New Attribute",
            type: "attribute",
        };
        
        return await Item.create(itemData, { parent: this.actor });
    }

    /**
    * Handle event when the user opens an attribute.
    * @param event
    * @private
    */
    #onAttributeOpen(event) {
        event.preventDefault();
        
        const listItem = $(event.currentTarget).parents(".attribute");
        const attribute = this.actor.items.get(listItem.data("itemId"));
        attribute.sheet.render(true);
    }

    /**
    * Handle event when the user deletes an attribute.
    * @param event
    * @private
    */
    #onAttributeDelete(event) {
        event.preventDefault();
        
        const listItem = $(event.currentTarget).parents(".attribute");
        const attribute = this.actor.items.get(listItem.data("itemId"));
        attribute.delete();
    }

    /**
    * Handle event when the user performs a Roll to Do.
    * @param event
    * @private
    */
    async #onRollToDo(event) {
        event.preventDefault();

        const d20Roll = await new Roll("1d20").evaluate();
        let templatePath = "systems/sentiment/templates/rolls/";
        let templateValues = {
            d20Roll: d20Roll.total,
            total: d20Roll.total
        };

        if (this.#swingAttribute === null) {
            templatePath += "roll-to-do-wild.html";

            const d6Roll = await new Roll("1d6").evaluate();
            templateValues.d6Roll = d6Roll.total;
            templateValues.total += d6Roll.total;
        }
        else {
            templatePath += "roll-to-do-swing.html";
            templateValues.swingValue = this.#swingValue;
            templateValues.swingAttribute = this.#swingAttribute.name;
            templateValues.total += this.#swingValue;
        }

        this.#renderToChatMessage(templatePath, templateValues);
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
                alias: this.actor.name
            },
            content: html
        };

        return ChatMessage.create(message);
    }

    /**
    * Handle event when the user performs a Roll to Dye.
    * @param event
    * @private
    */
    async #onRollToDye(event) {
        event.preventDefault();
        
        const existingSwingAttributeDie = this.#swingAttribute ? {
            attribute: this.#swingAttribute,
            roll: this.#swingValue - this.#swingAttribute.system.modifier,
            existing: true
        } : null;

        const attributeDice = await this.#rollAttributeDice(existingSwingAttributeDie);
        await this.#renderAttributeDice(attributeDice);

        const chosenAttributeDie = await this.#renderChooseSwingDialog(attributeDice);
        if (chosenAttributeDie != null) {
            this.object.update({
                "system.swing.attributeId": chosenAttributeDie.attribute._id,
                "system.swing.value": chosenAttributeDie.roll + chosenAttributeDie.attribute.system.modifier
            });
        }

        const newSwingAttributeDie = chosenAttributeDie ?? existingSwingAttributeDie;
        
        let rollToDyeTotal = attributeDice.reduce((total, attributeDie) => total + attributeDie.roll, 0);
        rollToDyeTotal += newSwingAttributeDie?.attribute.system.modifier ?? 0;

        this.#renderRollToDyeResult(rollToDyeTotal, newSwingAttributeDie);  
    }

    /**
    * Roll a d6 associated with each of the character's attributes. The character's existing swing attribute, if any, is retained at its current value.
    * @param swingAttributeDie
    * @private
    */
    async #rollAttributeDice(swingAttributeDie) {
        let attributeDice = [];

        for (let attribute of this.#attributes) {
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
    * @param attributeDice
    * @private
    */
    async #renderAttributeDice(attributeDice) {
        const templatePath = "systems/sentiment/templates/rolls/roll-to-dye-dice.html";
        return this.#renderToChatMessage(templatePath, { attributeDice: attributeDice });
    }

    /**
    * Render a dialog allowing the user to choose a new swing for the character based on the results of their Roll to Dye.
    * @param attributeDice
    * @private
    */
    async #renderChooseSwingDialog(attributeDice) {
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
                title: "Roll To Dye",
                content: content,
                buttons: buttons,
                close: () => { resolve(null) }
            };

            new Dialog(chooseSwingDialog).render(true);
        });
    }

    /**
    * Render a chat message announcing the final result of the character's Roll to Dye including their chosen swing, if any.
    * @param total
    * @param swingAttributeDie
    * @private
    */
    async #renderRollToDyeResult(total, swingAttributeDie) {
        let templatePath = "systems/sentiment/templates/rolls/";
        let templateValues = {
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
        
        this.#renderToChatMessage(templatePath, templateValues);
    }
}
