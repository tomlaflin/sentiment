import {
    AttributeStatus,
    GiftEquipStatus,
    RollTypes,
    AttributeStatusStrings
} from "../enums.mjs";

import { AttributeIdNoSwing } from "../documents/character.mjs"
import { GiftEquipStatusInitial } from "../documents/gift.mjs"

const ListSortValueIncrement = 100000;

export default class CharacterSheet extends ActorSheet {

    static RegisterHandlebarsHelpers() {
        Handlebars.registerHelper('toJSON', function (object) {
            return JSON.stringify(object);
        });
    }
    
    #gifts;

    /** @inheritdoc */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["sentiment", "sheet", "character"],
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
        this.#populateSwingAttributeOptions(context);
        this.#populateGifts(context);
        this.#populateCustomRolls(context);
        this.#populateConstants(context);

        context.showSwingValueInput = context.data.system.swing.attributeId !== AttributeIdNoSwing;

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
      * Embed additional dervied data relating to the status of each attribute for easy access.
      * @param context
      * @private
      */
    #populateAttributeStatusProperties(context) {
        for (let attribute of context.attributes) {
            attribute.statusString = AttributeStatusStrings.get(attribute.system.status);
            if (attribute.statusString === undefined) {
                throw new Error(`Unexpected AttributeStatus ${attribute.system.status} in attribute with ID ${attribute._id}`);
            }

            switch (attribute.system.status) {
                case AttributeStatus.Normal:
                    attribute.showRestoreButton = false;
                    attribute.showLockOutButton = true;
                    attribute.showWoundButton = true;
                    break;
                case AttributeStatus.LockedOut:
                    attribute.showRestoreButton = true;
                    attribute.showLockOutButton = false;
                    attribute.showWoundButton = true;
                    break;
                case AttributeStatus.Wounded:
                    attribute.showRestoreButton = true;
                    attribute.showLockOutButton = false;
                    attribute.showWoundButton = false;
                    break;
            }
        }
    }

    /**
      * Create key-value pairs for the swing attribute dropdown and embed them into the context for easy access.
      * @param context
      * @private
      */
    #populateSwingAttributeOptions(context) {
        context.swingAttributeOptions = {
            [AttributeIdNoSwing]: "None"
        };

        context.attributes.forEach((attribute) => {
            if (attribute.system.status === AttributeStatus.Normal) {
                context.swingAttributeOptions[attribute._id] = attribute.name;
            }
        });
    }

    /**
    * Iterate all owned items and embed collections containing gifts of each different Equip Status into the context for easy access.
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
    * Iterate all owned items and embed a collection containing only the custom rolls into the context for easy access.
    * @param context
    * @private
    */
    #populateCustomRolls(context) {
        context.customRolls = [];
        for (let item of context.items) {
            if (item.type == "customRoll") {
                context.customRolls.push(item);
                item.showToHit = item.system.rollType === "RollToDo";
            }
        }
    }

    /**
    * Embed constants and enums in the context so their values can be referenced in Handlebars.
    * @param context
    * @private
    */
    async #populateConstants(context) {
        context.AttributeIdNoSwing = AttributeIdNoSwing;
        context.GiftEquipStatus = GiftEquipStatus;
        context.RollTypes = RollTypes;
    }

    /** @inheritdoc */
    activateListeners(html) {
        super.activateListeners(html);
        
        html.find(".attribute-open").click(this.#onAttributeOpen.bind(this));
        html.find(".gift-open").click(this.#onGiftOpen.bind(this));

        if (!this.isEditable) {
            return;
        }

        html.find(".attribute-restore").click(this.#onAttributeRestore.bind(this));
        html.find(".attribute-lock-out").click(this.#onAttributeLockOut.bind(this));
        html.find(".attribute-wound").click(this.#onAttributeWound.bind(this));
        html.find(".attribute-add").click(this.#onAttributeAdd.bind(this));
        html.find(".attribute-delete").click(this.#onAttributeDelete.bind(this));
        html.find(".gift-add").click(this.#onGiftAdd.bind(this));
        html.find(".gift-delete").click(this.#onGiftDelete.bind(this));
        html.find(".custom-roll-add").click(this.#onCustomRollAdd.bind(this));
        html.find(".custom-roll-open").click(this.#onCustomRollOpen.bind(this));
        html.find(".custom-roll-delete").click(this.#onCustomRollDelete.bind(this));
        html.find(".custom-roll-execute").click(this.#onCustomRollExecute.bind(this));
        html.find(".drop-swing").click(this.#onDropSwing.bind(this));
        html.find(".roll-to-do").click(this.#onRollToDo.bind(this));
        html.find(".roll-to-dye").click(this.#onRollToDye.bind(this));
        html.find(".recovery-roll").click(this.#onRecoveryRoll.bind(this));

        this.#setDragDataOnButton(html, ".drop-swing", "dropSwing");
        this.#setDragDataOnButton(html, ".roll-to-do", "rollToDo");
        this.#setDragDataOnButton(html, ".roll-to-dye", "rollToDye");
        this.#setDragDataOnButton(html, ".recovery-roll", "recoveryRoll");
        this.#setDragDataOnCustomRolls(html);
    }

    /**
    * Set up the specified button so it can be dragged to the macro bar to create a shortcut to its function.
    * @param html
    * @param htmlClass
    * @param functionName
    * @private
    */
    #setDragDataOnButton(html, htmlClass, functionName) {
        html.find(htmlClass).each((i, button) => {
            button.setAttribute("draggable", true);
            button.addEventListener("dragstart", event => {
                let dragData = {
                    macroName: this.object.name + ": " + button.title,
                    actorId: this.object._id,
                    function: functionName
                };
                event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
            }, false);
        });
    }

    /**
    * Set up custom roll list items so they can be dragged to the macro bar to create shortcuts to their functions.
    * @private
    * @param html
    */
    #setDragDataOnCustomRolls(html) {
        html.find(".custom-roll").each((i, element) => {
            element.setAttribute("draggable", true);
            element.addEventListener("dragstart", event => {
                const customRoll = JSON.parse(event.target.dataset["customRoll"]);
                let dragData = {
                    macroName: this.object.name + ": " + customRoll.name,
                    actorId: this.object._id,
                    function: "executeCustomRoll",
                    argsLiteral: `"${customRoll._id}"`
                };
                event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
            }, false);
        });
    }

    /**
    * Handle event when the user restores an attribute from being locked out or wounded.
    * @param event
    * @private
    */
    async #onAttributeRestore(event) {
        event.preventDefault();

        const attribute = this.#getItemFromListEvent(event);
        this.object.setAttributeStatus(attribute._id, AttributeStatus.Normal);
    }

    /**
    * Handle event when the user locks out an attribute.
    * @param event
    * @private
    */
    async #onAttributeLockOut(event) {
        event.preventDefault();
        
        const attribute = this.#getItemFromListEvent(event);
        this.object.setAttributeStatus(attribute._id, AttributeStatus.LockedOut);
    }

    /**
    * Handle event when the user wounds an attribute.
    * @param event
    * @private
    */
    async #onAttributeWound(event) {
        event.preventDefault();

        const attribute = this.#getItemFromListEvent(event);
        this.object.setAttributeStatus(attribute._id, AttributeStatus.Wounded);
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

        const giftList = this.#gifts[GiftEquipStatusInitial];
        const sortValue = giftList.length > 0 ? giftList[giftList.length - 1].sort + ListSortValueIncrement : 0;

        const itemData = {
            name: "New Gift",
            type: "gift",
            sort: sortValue
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

    /**
    * Handle event when the user adds a custom roll.
    * @param event
    * @private
    */
    async #onCustomRollAdd(event) {
        event.preventDefault();

        const customRollData = {
            name: "New Custom Roll",
            type: "customRoll"
        };

        return await Item.create(customRollData, { parent: this.actor });
    }

    /**
    * Handle event when the user opens a custom roll.
    * @param event
    * @private
    */
    #onCustomRollOpen(event) {
        event.preventDefault();

        const customRoll = this.#getItemFromListEvent(event);
        customRoll.sheet.render(true);
    }

    /**
    * Handle event when the user deletes a custom roll.
    * @param event
    * @private
    */
    async #onCustomRollDelete(event) {
        event.preventDefault();

        const customRoll = this.#getItemFromListEvent(event);
        customRoll.delete();
    }

    /**
    * Handle event when the user executes a custom roll.
    * @param event
    * @private
    */
    async #onCustomRollExecute(event) {
        event.preventDefault();

        const customRoll = this.#getItemFromListEvent(event);
        this.object.executeCustomRoll(customRoll._id);
    }

    /** @inheritdoc */
    _onDragStart(event) {
        super._onDragStart(event);

        const draggedGiftHtml = event.target.closest(".gift");
        if (draggedGiftHtml === null) {
            return;
        }

        const itemId = draggedGiftHtml.dataset["itemId"];
        event.dataTransfer.setData("gift", JSON.stringify({ giftId: itemId }));
    }

    /** @inheritdoc */
    _onDrop(event) {
        const giftListContainerHtml = event.target.closest(".gift-list-container");

        let droppedGiftId;
        try {
            const data = JSON.parse(event.dataTransfer.getData("gift"));
            droppedGiftId = data.giftId;
        } catch (err) { }

        if (!giftListContainerHtml || !droppedGiftId) {
            return super._onDrop(event);
        }

        const giftDroppedUponId = event.target.closest(".gift")?.dataset["itemId"];
        this.#handleGiftDroppedOnList(droppedGiftId, giftDroppedUponId, giftListContainerHtml);
    }

    /**
    * React to a gift being dropped in a gift list by updating the gift's equip status and rearranging the destination list if necessary.
    * Gifts dropped on the header of a list move to the top of that list. Gifts dropped on another gift move either directly before that
    * gift (if dropped gift was moved up) or directly after that gift (if the dropped gift was moved down.)
    * @param droppedGiftId
    * @param giftDroppedUponId
    * @param giftListContainerHtml
    * @private
    */
    #handleGiftDroppedOnList(droppedGiftId, giftDroppedUponId, giftListContainerHtml) {
        if (droppedGiftId === giftDroppedUponId) {
            return;
        }

        const droppedGift = this.object.items.find((item) => item._id === droppedGiftId);
        if (!droppedGift) {
            throw new Error("Dropped gift ID not found among the character's items.");
        }

        const giftDroppedUpon = this.object.items.get(giftDroppedUponId);

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
                newSortValue = destinationGiftList[0].sort - ListSortValueIncrement;
            }
            else if (targetListIndex == destinationGiftList.length) {
                newSortValue = destinationGiftList[destinationGiftList.length - 1].sort + ListSortValueIncrement;
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
    * Handle event when the user performs a Roll to Do.
    * @param event
    * @private
    */
    async #onRollToDo(event) {
        event.preventDefault();
        this.object.rollToDo();
    }

    /**
    * Handle event when the user performs a Roll to Dye.
    * @param event
    * @private
    */
    async #onRollToDye(event) {
        event.preventDefault();
        this.object.rollToDye();
    }

    /**
    * Handle event when the user performs a Recovery Roll.
    * @param event
    * @private
    */
    async #onRecoveryRoll(event) {
        event.preventDefault();
        this.object.recoveryRoll();
    }

    /**
    * Handle event when the user drops the character's swing.
    * @param event
    * @private
    */
    #onDropSwing(event) {
        event.preventDefault();
        this.object.dropSwing();
    }
}
