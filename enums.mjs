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

// The game's core roll types and their associated strings.
export const RollTypes = Object.freeze({
    RollToDo: {
        DisplayName: "Roll To Do",
        FunctionName: "rollToDo"
    },
    RollToDye: {
        DisplayName: "Roll To Dye",
        FunctionName: "rollToDye"
    },
    RecoveryRoll: {
        DisplayName: "Recovery Roll",
        FunctionName: "recoveryRoll"
    }
});

export const AttributeStatusStrings = new Map([
    [AttributeStatus.Normal, "Normal"],
    [AttributeStatus.LockedOut, "Locked Out"],
    [AttributeStatus.Wounded, "Wounded"]
]);