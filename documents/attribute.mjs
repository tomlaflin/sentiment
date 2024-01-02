export default class AttributeData extends foundry.abstract.DataModel {
    static defineSchema() {
        return {
            modifier: new foundry.data.fields.NumberField({
                integer: true,
                initial: 0,
                min: 0
            })
        };
    }
}