/**
 * Create a macro to invoke a character function from data dropped in a macro bar slot.
 * @param data
 * @param slot
 */
export default async function createCharacterMacro(data, slot) {
    if (!data.actorId || !data.function) {
        throw new Error("createCharacterMacro called with required values missing from data object.");
    }
    
    const command =
`const actor = game.actors.get("${data.actorId}");
actor.${data.function}();`

    const macro = await Macro.create({
        name: data.macroName,
        type: "script",
        command: command
    });

    game.user.assignHotbarMacro(macro, slot);
}
