import { ArmorItem } from '../../interfaces/items/ArmorItem';

export const armor: Record<string, ArmorItem> = {
    basic_glove: {
        id: 'basic_glove',
        name: 'Basic Glove',
        description: 'Simple protective glove',
        type: 'armor',
        defense: 5,
        movementPenalty: 0,
        durability: 100,
        cost: 0,
        unlockLevel: 1,
        owned: true,
        rarity: 'common',
        icon: '/assets/armor/basic_glove.png',
        model: '/assets/models/armor/basic_glove.glb'
    },
    reinforced_glove: {
        id: 'reinforced_glove',
        name: 'Reinforced Glove',
        description: 'Hardened protective glove',
        type: 'armor',
        defense: 10,
        movementPenalty: 0.1,
        durability: 150,
        cost: 150,
        unlockLevel: 3,
        owned: false,
        rarity: 'uncommon',
        icon: '/assets/armor/reinforced_glove.png',
        model: '/assets/models/armor/reinforced_glove.glb',
        resistances: [
            {
                type: 'physical',
                value: 10
            }
        ]
    },
    power_gauntlet: {
        id: 'power_gauntlet',
        name: 'Power Gauntlet',
        description: 'Enhanced protective gauntlet',
        type: 'armor',
        defense: 20,
        movementPenalty: 0.2,
        durability: 200,
        cost: 300,
        unlockLevel: 6,
        owned: false,
        rarity: 'rare',
        icon: '/assets/armor/power_gauntlet.png',
        model: '/assets/models/armor/power_gauntlet.glb',
        resistances: [
            {
                type: 'physical',
                value: 20
            },
            {
                type: 'fire',
                value: 10
            }
        ]
    }
}; 