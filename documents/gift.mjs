export default class GiftData extends foundry.abstract.DataModel {
    static defineSchema() {
        return {
            description: new foundry.data.fields.HTMLField()
        };
    }
}