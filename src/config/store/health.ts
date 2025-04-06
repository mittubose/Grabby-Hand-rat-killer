import { HealthItem } from '../../interfaces/items/HealthItem';

export const healthItems: Record<string, HealthItem> = {
    small_bandage: {
        id: 'small_bandage',
        name: 'Small Bandage',
        description: 'Basic healing item',
        type: 'health',
        heal: 20,
        duration: 0,
        cooldown: 1,
        quantity: 0,
        cost: 25,
        unlockLevel: 1,
        owned: false,
        rarity: 'common',
        icon: '/assets/items/small_bandage.png'
    },
    med_kit: {
        id: 'med_kit',
        name: 'Med Kit',
        description: 'Advanced healing kit',
        type: 'health',
        heal: 50,
        duration: 5,
        cooldown: 2,
        quantity: 0,
        cost: 75,
        unlockLevel: 3,
        owned: false,
        rarity: 'uncommon',
        icon: '/assets/items/med_kit.png',
        effects: [
            {
                type: 'regeneration',
                value: 2,
                duration: 5
            }
        ]
    },
    super_serum: {
        id: 'super_serum',
        name: 'Super Serum',
        description: 'Powerful healing serum',
        type: 'health',
        heal: 100,
        duration: 10,
        cooldown: 5,
        quantity: 0,
        cost: 150,
        unlockLevel: 5,
        owned: false,
        rarity: 'rare',
        icon: '/assets/items/super_serum.png',
        effects: [
            {
                type: 'regeneration',
                value: 5,
                duration: 10
            },
            {
                type: 'speed_boost',
                value: 1.5,
                duration: 5
            }
        ]
    }
}; 