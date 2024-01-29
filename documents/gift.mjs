import { GiftEquipStatus } from "../enums.mjs";

export const GiftEquipStatusInitial = GiftEquipStatus.Unequipped;

export class GiftData extends foundry.abstract.DataModel {
    static defineSchema() {
        return {
            description: new foundry.data.fields.HTMLField(),
            equipStatus: new foundry.data.fields.NumberField({
                integer: true,
                initial: GiftEquipStatusInitial
            })
        };
    }
}