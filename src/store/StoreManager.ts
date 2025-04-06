import { weapons } from '../config/store/weapons';
import { armor } from '../config/store/armor';
import { healthItems } from '../config/store/health';
import { WeaponItem } from '../interfaces/items/WeaponItem';
import { ArmorItem } from '../interfaces/items/ArmorItem';
import { HealthItem } from '../interfaces/items/HealthItem';
import { BaseItem } from '../interfaces/BaseItem';

export class StoreManager {
    private playerLevel: number = 1;
    private playerCoins: number = 0;
    private equippedWeapon: string = 'basic_hand';
    private equippedArmor: string = 'basic_glove';
    private inventory: Map<string, number> = new Map();

    constructor() {
        // Initialize inventory with owned items
        Object.values(weapons).forEach(weapon => {
            if (weapon.owned) this.inventory.set(weapon.id, 1);
        });
        Object.values(armor).forEach(armor => {
            if (armor.owned) this.inventory.set(armor.id, 1);
        });
        Object.values(healthItems).forEach(item => {
            if (item.owned) this.inventory.set(item.id, item.quantity);
        });
    }

    public getAvailableItems(category: 'weapons' | 'armor' | 'health'): BaseItem[] {
        switch (category) {
            case 'weapons':
                return Object.values(weapons);
            case 'armor':
                return Object.values(armor);
            case 'health':
                return Object.values(healthItems);
        }
    }

    public getInventoryItems(): Map<string, number> {
        return new Map(this.inventory);
    }

    public canPurchase(itemId: string): boolean {
        const item = this.findItem(itemId);
        if (!item) return false;
        return this.playerLevel >= item.unlockLevel && this.playerCoins >= item.cost;
    }

    public purchaseItem(itemId: string): boolean {
        if (!this.canPurchase(itemId)) return false;

        const item = this.findItem(itemId);
        if (!item) return false;

        this.playerCoins -= item.cost;
        
        if (item.type === 'health') {
            const healthItem = item as HealthItem;
            const currentQuantity = this.inventory.get(itemId) || 0;
            this.inventory.set(itemId, currentQuantity + 1);
            healthItem.quantity = currentQuantity + 1;
        } else {
            this.inventory.set(itemId, 1);
            item.owned = true;
        }

        return true;
    }

    public useHealthItem(itemId: string): boolean {
        const item = healthItems[itemId];
        if (!item) return false;

        const quantity = this.inventory.get(itemId) || 0;
        if (quantity <= 0) return false;

        this.inventory.set(itemId, quantity - 1);
        item.quantity = quantity - 1;
        return true;
    }

    public equipItem(itemId: string): boolean {
        const item = this.findItem(itemId);
        if (!item || !item.owned) return false;

        switch (item.type) {
            case 'weapon':
                this.equippedWeapon = itemId;
                break;
            case 'armor':
                this.equippedArmor = itemId;
                break;
            default:
                return false;
        }
        return true;
    }

    public getEquippedItems(): { weapon: WeaponItem, armor: ArmorItem } {
        return {
            weapon: weapons[this.equippedWeapon],
            armor: armor[this.equippedArmor]
        };
    }

    private findItem(itemId: string): BaseItem | undefined {
        return weapons[itemId] || armor[itemId] || healthItems[itemId];
    }

    // Getters and setters for player stats
    public setPlayerLevel(level: number): void {
        this.playerLevel = level;
    }

    public setPlayerCoins(coins: number): void {
        this.playerCoins = coins;
    }

    public getPlayerLevel(): number {
        return this.playerLevel;
    }

    public getPlayerCoins(): number {
        return this.playerCoins;
    }
} 