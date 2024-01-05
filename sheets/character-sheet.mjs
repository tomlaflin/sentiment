export default class CharacterSheet extends ActorSheet {

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

    /** @inheritdoc */
    activateListeners(html) {
        super.activateListeners(html);
        
        html.find('.attribute-open').click(this.#onAttributeOpen.bind(this));

        if (this.isEditable) {
            html.find(".attribute-add").click(this.#onAttributeAdd.bind(this));
            html.find(".attribute-delete").click(this.#onAttributeDelete.bind(this));
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
}
