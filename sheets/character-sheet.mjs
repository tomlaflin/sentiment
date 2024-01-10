export default class CharacterSheet extends ActorSheet {

    #swingAttributeId;

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
        this.#cacheSwingAttribute(context);

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
        context.attributes = [];
        for (let item of context.items) {
            if (item.type == "attribute") {
                context.attributes.push(item);
            }
        }
    }

    /**
    * Find the attribute associated with the character's current swing, if any, and cache it for reference after the form is rendered.
    * @param context
    * @private
    */
    #cacheSwingAttribute(context) {
        // Guard against the case where the attribute associated with our swing was deleted out from under us.
        const attributeExists = context.attributes.some((attribute) => attribute._id == context.data.system.swing.attributeId);
        this.#swingAttributeId = attributeExists ? context.data.system.swing.attributeId : null;
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
    }

    /**
    * Set value and display for the swing controls based on the cached swingAttributeId.
    * @param context
    * @private
    */
    #updateSwingControls() {
        this.form.querySelector(".swing-attribute-selector").value = this.#swingAttributeId;

        const swingValueInput = this.form.querySelector(".swing-value");
        if (this.#swingAttributeId === null) {
            swingValueInput.style.display = "none";
            swingValueInput.value = 0;
        }
        else {
            swingValueInput.style.display = "flex";
        }
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

        let d20Roll = new Roll("1d20");
        await d20Roll.evaluate();

        let d6Roll = new Roll("1d6");
        await d6Roll.evaluate();

        const template = "systems/sentiment/templates/rolls/roll-to-do.html";
        const html = await renderTemplate(template, {
            d20Roll: d20Roll,
            d6Roll: d6Roll,
            total: d20Roll.total + d6Roll.total
        });

        let message = {
            speaker: {
                alias: this.actor.name
            },
            content: html
        };

        ChatMessage.create(message);
    }

    /** @inheritdoc */
    async _updateObject(event, formData) {
        await this.object.update({ "system.swing.attributeId": formData[`swing-attribute-selector`] }, {});

        return super._updateObject(event, formData);
    }
}
