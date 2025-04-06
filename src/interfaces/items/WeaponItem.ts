import { BaseItem } from '../BaseItem';

export interface WeaponItem extends BaseItem {
    type: 'weapon';
    damage: number;
    speed: number;
    range: number;
    attackSpeed: number;
    projectileType?: string;
    effects?: {
        type: string;
        value: number;
        duration: number;
    }[];
} 