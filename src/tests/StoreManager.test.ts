import { StoreManager } from '../store/StoreManager';
import { weapons } from '../config/store/weapons';
import { armor } from '../config/store/armor';
import { healthItems } from '../config/store/health';

describe('StoreManager', () => {
    let store: StoreManager;

    beforeEach(() => {
        store = new StoreManager();
        store.setPlayerLevel(1);
        store.setPlayerCoins(1000);
    });

    describe('Initialization', () => {
        test('should initialize with basic items', () => {
            const inventory = store.getInventoryItems();
            expect(inventory.get('basic_hand')).toBe(1);
            expect(inventory.get('basic_glove')).toBe(1);
        });

        test('should have correct initial equipped items', () => {
            const equipped = store.getEquippedItems();
            expect(equipped.weapon.id).toBe('basic_hand');
            expect(equipped.armor.id).toBe('basic_glove');
        });
    });

    describe('Item Purchase', () => {
        test('should successfully purchase available item', () => {
            const result = store.purchaseItem('power_hand');
            expect(result).toBe(true);
            expect(store.getInventoryItems().get('power_hand')).toBe(1);
            expect(store.getPlayerCoins()).toBeLessThan(1000);
        });

        test('should fail to purchase item with insufficient coins', () => {
            store.setPlayerCoins(0);
            const result = store.purchaseItem('power_hand');
            expect(result).toBe(false);
            expect(store.getInventoryItems().get('power_hand')).toBeUndefined();
        });

        test('should fail to purchase item with insufficient level', () => {
            const result = store.purchaseItem('lightning_hand');
            expect(result).toBe(false);
            expect(store.getInventoryItems().get('lightning_hand')).toBeUndefined();
        });
    });

    describe('Health Items', () => {
        test('should successfully purchase and use health item', () => {
            store.purchaseItem('small_bandage');
            expect(store.getInventoryItems().get('small_bandage')).toBe(1);

            const useResult = store.useHealthItem('small_bandage');
            expect(useResult).toBe(true);
            expect(store.getInventoryItems().get('small_bandage')).toBe(0);
        });

        test('should fail to use non-existent health item', () => {
            const result = store.useHealthItem('small_bandage');
            expect(result).toBe(false);
        });
    });

    describe('Equipment Management', () => {
        test('should successfully equip owned item', () => {
            store.purchaseItem('power_hand');
            const result = store.equipItem('power_hand');
            expect(result).toBe(true);
            expect(store.getEquippedItems().weapon.id).toBe('power_hand');
        });

        test('should fail to equip unowned item', () => {
            const result = store.equipItem('power_hand');
            expect(result).toBe(false);
            expect(store.getEquippedItems().weapon.id).toBe('basic_hand');
        });
    });

    describe('Item Availability', () => {
        test('should return all weapons', () => {
            const items = store.getAvailableItems('weapons');
            expect(items.length).toBe(Object.keys(weapons).length);
        });

        test('should return all armor', () => {
            const items = store.getAvailableItems('armor');
            expect(items.length).toBe(Object.keys(armor).length);
        });

        test('should return all health items', () => {
            const items = store.getAvailableItems('health');
            expect(items.length).toBe(Object.keys(healthItems).length);
        });
    });

    describe('Purchase Validation', () => {
        test('should validate level requirements', () => {
            expect(store.canPurchase('power_hand')).toBe(true);
            expect(store.canPurchase('lightning_hand')).toBe(false);
        });

        test('should validate coin requirements', () => {
            store.setPlayerCoins(50);
            expect(store.canPurchase('power_hand')).toBe(false);
            store.setPlayerCoins(1000);
            expect(store.canPurchase('power_hand')).toBe(true);
        });
    });
}); 