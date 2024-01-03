import AttributeData from "./attribute.mjs";

export default class CharacterData extends foundry.abstract.DataModel {
    static defineSchema() {
        return {
            description: new foundry.data.fields.HTMLField()
        };
    }
}