import { BaseItem } from '../BaseItem';

export interface ArmorItem extends BaseItem {
    type: 'armor';
    defense: number;
    movementPenalty: number;
    durability: number;
    resistances?: {
        type: string;
        value: number;
    }[];
} 