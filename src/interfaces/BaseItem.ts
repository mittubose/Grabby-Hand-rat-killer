export interface BaseItem {
    id: string;
    name: string;
    description: string;
    cost: number;
    unlockLevel: number;
    owned: boolean;
    type: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    icon?: string;
    model?: string;
} 