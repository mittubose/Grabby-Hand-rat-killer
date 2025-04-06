import { WeaponItem } from '../../interfaces/items/WeaponItem';

export const weapons: Record<string, WeaponItem> = {
    basic_hand: {
        id: 'basic_hand',
        name: 'Basic Hand',
        description: 'A simple grabbing hand',
        type: 'weapon',
        damage: 10,
        speed: 15,
        range: 10,
        attackSpeed: 1,
        cost: 0,
        unlockLevel: 1,
        owned: true,
        rarity: 'common',
        icon: '/assets/weapons/basic_hand.png',
        model: '/assets/models/weapons/basic_hand.glb'
    },
    power_hand: {
        id: 'power_hand',
        name: 'Power Hand',
        description: 'Enhanced grabbing power',
        type: 'weapon',
        damage: 20,
        speed: 20,
        range: 12,
        attackSpeed: 1.2,
        cost: 100,
        unlockLevel: 2,
        owned: false,
        rarity: 'uncommon',
        icon: '/assets/weapons/power_hand.png',
        model: '/assets/models/weapons/power_hand.glb',
        effects: [
            {
                type: 'stun',
                value: 1,
                duration: 2
            }
        ]
    },
    lightning_hand: {
        id: 'lightning_hand',
        name: 'Lightning Hand',
        description: 'Electrified grabbing hand',
        type: 'weapon',
        damage: 30,
        speed: 25,
        range: 15,
        attackSpeed: 1.5,
        cost: 250,
        unlockLevel: 5,
        owned: false,
        rarity: 'rare',
        icon: '/assets/weapons/lightning_hand.png',
        model: '/assets/models/weapons/lightning_hand.glb',
        effects: [
            {
                type: 'shock',
                value: 5,
                duration: 3
            }
        ]
    }
}; 