// Enum type for attribute states.
export const AttributeStatus = Object.freeze({
    Normal: 0,
    LockedOut: 1,
    Wounded: 2
});

// Enum type for attribute states.
export const GiftEquipStatus = Object.freeze({
    Unequipped: 0,
    Equipped: 1,
    Primary: 2
});

// Enum type for the game's various rolls.
export const RollType = Object.freeze({
    RollToDo: "rollToDo",
    RollToDye: "rollToDye",
    RecoveryRoll: "recoveryRoll"
});