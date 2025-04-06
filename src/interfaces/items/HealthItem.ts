import { BaseItem } from '../BaseItem';

export interface HealthItem extends BaseItem {
    type: 'health';
    heal: number;
    duration: number;
    cooldown: number;
    quantity: number;
    effects?: {
        type: string;
        value: number;
        duration: number;
    }[];
} 