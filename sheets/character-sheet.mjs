import {
    AttributeStatus,
    GiftEquipStatus
} from "../enums.mjs";

export default class CharacterSheet extends ActorSheet {

    #attributes;
    #swingAttribute;
    #swingValue;
    #gifts;

    static RegisterHandlebarsHelpers() {
        Handlebars.registerHelper('isStatusNormal', function (attribute) {
            return attribute.system.status == AttributeStatus.Normal;
        });

        Handlebars.registerHelper('isStatusLockedOut', function (attribute) {
            return attribute.system.status == AttributeStatus.LockedOut;
        });

        Handlebars.registerHelper('isStatusWounded', function (attribute) {
            return attribute.system.status == AttributeStatus.Wounded;
        });
    }

    /** @inheritdoc */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["sentiment", "sheet"],
            template: "systems/sentiment/templates/character-sheet.html",
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }],
            dragDrop: [
                { dragSelector: ".attribute-list .attribute", dropSelector: null },
                { dragSelector: ".gift-list .gift", dropSelector: null }
            ]
        });
    }
    
    /** @inheritdoc */
    async getData(options) {
        const context = await super.getData(options);

        await this.#populateDescription(context);
        this.#populateAttributes(context);
        this.#populateAttributeStatusProperties(context);
        this.#populateGifts(context);
        this.#cacheSwing(context);
        this.#populateGiftEquipStatus(context);

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
      * Embed additional dervied data relating to the status of each attribute for easy access.
      * @param context
      * @private
      */
    #populateAttributeStatusProperties(context) {
        for (let attribute of context.attributes) {
            switch (attribute.system.status) {
                case AttributeStatus.Normal:
                    attribute.statusString = "";
                    attribute.displayRestoreButton = false;
                    attribute.displayLockOutButton = true;
                    attribute.displayWoundButton = true;
                    break;
                case AttributeStatus.LockedOut:
                    attribute.statusString = "Lockout";
                    attribute.displayRestoreButton = true;
                    attribute.displayLockOutButton = false;
                    attribute.displayWoundButton = true;
                    break;
                case AttributeStatus.Wounded:
                    attribute.statusString = "Wounded";
                    attribute.displayRestoreButton = true;
                    attribute.displayLockOutButton = false;
                    attribute.displayWoundButton = false;
                    break;
                default:
                    throw new Error("Unknown AttributeStatus in attribute with ID " + attribute._id);
            }
        }
    }

    /**
    * Iterate all owned items and embed collections contain gifts of each different Equip Status into the context for easy access.
    * @param context
    * @private
    */
    #populateGifts(context) {
        this.#gifts = {
            [GiftEquipStatus.Primary]: [],
            [GiftEquipStatus.Equipped]: [],
            [GiftEquipStatus.Unequipped]: [],
        }
        
        for (let item of context.items) {
            if (item.type == "gift") {
                this.#gifts[item.system.equipStatus].push(item);
            }
        }

        context.primaryGifts = this.#gifts[GiftEquipStatus.Primary];
        context.equippedGifts = this.#gifts[GiftEquipStatus.Equipped];
        context.unequippedGifts = this.#gifts[GiftEquipStatus.Unequipped];
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

    /**
    * Embed the GiftEquipStatus enum in the context so its values can be referenced in Handlebars.
    * @param context
    * @private
    */
    async #populateGiftEquipStatus(context) {
        context.GiftEquipStatus = GiftEquipStatus;
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
        html.find('.gift-open').click(this.#onGiftOpen.bind(this));

        if (!this.isEditable) {
            return;
        }

        html.find('.attribute-restore').click(this.#onAttributeRestore.bind(this));
        html.find('.attribute-lock-out').click(this.#onAttributeLockOut.bind(this));
        html.find('.attribute-wound').click(this.#onAttributeWound.bind(this));
        html.find(".attribute-add").click(this.#onAttributeAdd.bind(this));
        html.find(".attribute-delete").click(this.#onAttributeDelete.bind(this));
        html.find(".gift-add").click(this.#onGiftAdd.bind(this));
        html.find(".gift-delete").click(this.#onGiftDelete.bind(this));
        html.find(".drop-swing").click(this.#onDropSwing.bind(this));
        html.find(".roll-to-do").click(this.#onRollToDo.bind(this));
        html.find(".roll-to-dye").click(this.#onRollToDye.bind(this));
        html.find(".recovery-roll").click(this.#onRecoveryRoll.bind(this));
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
    * Handle event when the user restores an attribute from being locked out or wounded.
    * @param event
    * @private
    */
    async #onAttributeRestore(event) {
        event.preventDefault();

        const attribute = this.#getItemFromListEvent(event);
        attribute.update({ "system.status": AttributeStatus.Normal });
    }

    /**
    * Handle event when the user locks out an attribute.
    * @param event
    * @private
    */
    async #onAttributeLockOut(event) {
        event.preventDefault();
        
        const attribute = this.#getItemFromListEvent(event);
        attribute.update({ "system.status": AttributeStatus.LockedOut });

        if (attribute._id === this.#swingAttribute?._id) {
            this.#removeSwing();
        }
    }

    /**
    * Handle event when the user wounds an attribute.
    * @param event
    * @private
    */
    async #onAttributeWound(event) {
        event.preventDefault();

        const attribute = this.#getItemFromListEvent(event);
        attribute.update({ "system.status": AttributeStatus.Wounded });

        if (attribute._id === this.#swingAttribute?._id) {
            this.#removeSwing();
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

        const attribute = this.#getItemFromListEvent(event);
        attribute.sheet.render(true);
    }

    /**
    * Handle event when the user deletes an attribute.
    * @param event
    * @private
    */
    #onAttributeDelete(event) {
        event.preventDefault();

        const attribute = this.#getItemFromListEvent(event);
        attribute.delete();
    }

    /**
    * Handle event when the user adds a gift.
    * @param event
    * @private
    */
    async #onGiftAdd(event) {
        event.preventDefault();

        const itemData = {
            name: "New Gift",
            type: "gift",
        };

        return await Item.create(itemData, { parent: this.actor });
    }

    /**
    * Handle event when the user opens a gift.
    * @param event
    * @private
    */
    #onGiftOpen(event) {
        event.preventDefault();

        const gift = this.#getItemFromListEvent(event);
        gift.sheet.render(true);
    }

    /**
    * Handle event when the user deletes a gift.
    * @param event
    * @private
    */
    #onGiftDelete(event) {
        event.preventDefault();

        const gift = this.#getItemFromListEvent(event);
        gift.delete();
    }

    /** @inheritdoc */
    _onDragStart(event) {
        const draggedGiftHtml = event.target.closest(".gift");
        if (draggedGiftHtml === null) {
            return super._onDragStart(event);
        }

        const itemId = draggedGiftHtml.dataset["itemId"];
        event.dataTransfer.setData("text/plain", JSON.stringify({ giftId: itemId }));
    }

    /** @inheritdoc */
    _onDrop(event) {
        const giftListContainerHtml = event.target.closest(".gift-list-container");

        let droppedGiftId;
        try {
            const data = JSON.parse(event.dataTransfer.getData("text/plain"));
            droppedGiftId = data.giftId;
        } catch (err) { }

        if (!giftListContainerHtml || !droppedGiftId) {
            return super._onDrop(event);
        }

        const droppedGift = this.object.items.find((item) => item._id === droppedGiftId);
        if (!droppedGift) {
            throw new Error("Dropped gift ID not found among the character's items.");
        }

        const giftDroppedUpon = this.object.items.get(event.target.closest(".gift")?.dataset["itemId"]);
        if (giftDroppedUpon && giftDroppedUpon._id == droppedGiftId) {
            return;
        }
        
        const giftEquipStatusFrom = droppedGift.system.equipStatus;
        const giftEquipStatusTo = Number(giftListContainerHtml.dataset["giftEquipStatus"]);

        let updates = {};

        if (giftEquipStatusFrom !== giftEquipStatusTo) {
            updates["system.equipStatus"] = giftEquipStatusTo;
        }

        const destinationGiftList = this.#gifts[giftEquipStatusTo];
        if (destinationGiftList.length > 0) {
            let targetListIndex = 0;
            
            if (giftDroppedUpon) {
                const movingToHigherList = giftEquipStatusFrom !== giftEquipStatusTo
                    && (giftEquipStatusTo == GiftEquipStatus.Primary || giftEquipStatusFrom == GiftEquipStatus.Unequipped);

                const movingUpWithinSameList = giftEquipStatusFrom === giftEquipStatusTo && droppedGift.sort > giftDroppedUpon.sort;

                const giftDroppedUponListIndex = destinationGiftList.findIndex((item) => item._id === giftDroppedUpon._id);
                targetListIndex = movingToHigherList || movingUpWithinSameList ? giftDroppedUponListIndex : giftDroppedUponListIndex + 1;
            }

            let newSortValue;
            if (targetListIndex == 0) {
                newSortValue = destinationGiftList[0].sort - 100000;
            }
            else if (targetListIndex == destinationGiftList.length) {
                newSortValue = destinationGiftList[destinationGiftList.length - 1].sort + 100000;
            }
            else {
                newSortValue = (destinationGiftList[targetListIndex].sort + destinationGiftList[targetListIndex - 1].sort) / 2;
            }

            updates["sort"] = newSortValue;
        }

        droppedGift.update(updates);
    }

    /**
     * Get the item associated with an event emitted from a list.
     * @param event
     * @private
     */
    #getItemFromListEvent(event) {
        const listItem = $(event.currentTarget).parents(".list-item");
        const item = this.actor.items.get(listItem.data("itemId"));
        return item;
    }

    /**
    * Handle event when the user drops the character's swing.
    * @param event
    * @private
    */
    #onDropSwing(event) {
        event.preventDefault();

        if (this.#swingAttribute === null) {
            return;
        }

        this.#removeSwing();
    }

    /**
    * Remove character's swing and send a notification in chat.
    * @private
    */
    #removeSwing() {
        this.object.update({
            "system.swing.attributeId": null,
            "system.swing.value": 0
        });

        const templatePath = "systems/sentiment/templates/rolls/drop-swing.html";
        this.#renderToChatMessage(templatePath, {});
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

        if (this.#swingAttribute !== null) {
            templatePath += "roll-to-do-swing.html";

            templateValues.swingValue = this.#swingValue;
            templateValues.swingAttribute = this.#swingAttribute.name;
            templateValues.total += this.#swingValue;
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
        const contentTemplatePath = "systems/sentiment/templates/rolls/roll-to-do-choose-attribute.html";
        const content = await renderTemplate(contentTemplatePath, {});

        return new Promise((resolve, reject) => {
            let buttons = {};

            for (const attribute of this.#attributes) {
                if (attribute.system.status == AttributeStatus.Normal) {
                    buttons[attribute._id] = {
                        label: attribute.name + " (+" + attribute.system.modifier + ")",
                        callback: () => { resolve(attribute) }
                    }
                }
            }

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

        const rollToDyeOptions = {
            rollTitle: "Roll to Dye",
            totalStrategy: this.#totalAllAttributeRollsAndOnlySwingModifier,
        }

        this.#executeRollToDye(rollToDyeOptions);
    }

    /**
    * Handle event when the user performs a Recovery Roll.
    * @param event
    * @private
    */
    async #onRecoveryRoll(event) {
        event.preventDefault();

        const rollToDyeOptions = {
            rollTitle: "Recovery Roll",
            totalStrategy: this.#totalAllAttributeRollsAndModifiers,
        }

        const rollToDyeTotal = await this.#executeRollToDye(rollToDyeOptions);
        const newHealth = Math.min(this.object.system.health.value + rollToDyeTotal, this.object.system.health.max);

        this.object.update({
            "system.health.value": newHealth
        });
    }

    /**
    * Common implementation of Roll to Dye. Scenario-specific parameters are injected via an options object.
    * @param rollToDyeOptions
    * @private
    */
    async #executeRollToDye(rollToDyeOptions) {
        const existingSwingAttributeDie = this.#swingAttribute ? {
            attribute: this.#swingAttribute,
            roll: this.#swingValue - this.#swingAttribute.system.modifier,
            existing: true
        } : null;

        const attributeDice = await this.#rollAttributeDice(existingSwingAttributeDie);
        await this.#renderAttributeDice(rollToDyeOptions.rollTitle, attributeDice);

        const availableAttributeDice = attributeDice.filter((attributeDie) => attributeDie.attribute.system.status == AttributeStatus.Normal);
        this.#releaseAttributesFromLockout();

        const chosenAttributeDie = availableAttributeDice.length > 0 ? await this.#renderChooseSwingDialog(rollToDyeOptions.rollTitle, availableAttributeDice) : null;
        if (chosenAttributeDie != null) {
            this.object.update({
                "system.swing.attributeId": chosenAttributeDie.attribute._id,
                "system.swing.value": chosenAttributeDie.roll + chosenAttributeDie.attribute.system.modifier
            });
        }

        const newSwingAttributeDie = chosenAttributeDie ?? existingSwingAttributeDie;
        const rollToDyeTotal = rollToDyeOptions.totalStrategy(availableAttributeDice, newSwingAttributeDie);
        this.#renderRollToDyeResult(rollToDyeOptions.rollTitle, rollToDyeTotal, newSwingAttributeDie);

        return rollToDyeTotal;
    }

    /**
    * Roll a d6 associated with each of the character's attributes. The character's existing swing attribute, if any, is retained at its current value.
    * @param swingAttributeDie
    * @private
    */
    async #rollAttributeDice(swingAttributeDie) {
        let attributeDice = [];

        for (const attribute of this.#attributes) {
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
    * @private
    */
    async #renderAttributeDice(rollTitle, attributeDice) {
        const templatePath = "systems/sentiment/templates/rolls/roll-to-dye-dice.html";
        return this.#renderToChatMessage(templatePath, {
            title: rollTitle,
            attributeDice: attributeDice
        });
    }

    /**
    * Restore all locked-out attributes to normal status.
    * @private
    */
    #releaseAttributesFromLockout() {
        for (const attribute of this.#attributes) {
            if (attribute.system.status == AttributeStatus.LockedOut) {
                this.actor.items.get(attribute._id).update({ "system.status": AttributeStatus.Normal });
            }
        }   
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
    * Total attribute dice including the modifier of each die. The swing die is not treated specially.
    * @param attributeDice
    * @param swingAttributeDie
    * @private
    */
    #totalAllAttributeRollsAndModifiers(attributeDice, swingAttributeDie) {
        return attributeDice.reduce((total, attributeDie) => total + attributeDie.roll + attributeDie.attribute.system.modifier, 0);
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
        
        this.#renderToChatMessage(templatePath, templateValues);
    }
}
