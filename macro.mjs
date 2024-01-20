/**
 * Create a macro to invoke a character function from data dropped in a macro bar slot.
 * @param data
 * @param slot
 */
export default async function tryCreateCharacterMacro(data, slot) {
    if (!data.actorId || !data.function) {
        return;
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
