# Grabby Hand Rat Killer - Project Structure

## Directory Structure

```
src/
├── assets/
│   ├── enemies/       # Enemy models and textures
│   ├── environment/   # Environment models and textures
│   ├── items/        # Item icons and models
│   └── weapons/      # Weapon models and effects
├── components/
│   ├── enemies/      # Enemy-related components
│   ├── environment/  # Environment-related components
│   ├── items/       # Item-related components
│   └── weapons/     # Weapon-related components
├── config/
│   └── store/
│       ├── weapons.ts   # Weapon configurations
│       ├── armor.ts     # Armor configurations
│       └── health.ts    # Health item configurations
├── interfaces/
│   ├── BaseItem.ts      # Base interface for all items
│   └── items/
│       ├── WeaponItem.ts  # Weapon interface
│       ├── ArmorItem.ts   # Armor interface
│       └── HealthItem.ts  # Health item interface
├── store/
│   └── StoreManager.ts  # Store management system
├── tests/
│   └── StoreManager.test.ts  # Store system tests
└── utils/              # Utility functions and helpers
```

## Key Components

### Store System
- `StoreManager`: Handles all store-related operations including:
  - Item purchase and validation
  - Equipment management
  - Inventory tracking
  - Player stats (level, coins)

### Items
1. Weapons
   - Customizable attributes: damage, speed, range, effects
   - Progression system with level requirements
   - Special effects and abilities

2. Armor
   - Defense stats and movement penalties
   - Resistance system
   - Durability tracking

3. Health Items
   - Healing effects and durations
   - Cooldown system
   - Special effects (regeneration, buffs)

### Testing
- Comprehensive test suite for store functionality
- Coverage requirements:
  - 80% branches
  - 80% functions
  - 80% lines
  - 80% statements

## Asset Management
- Organized asset structure for:
  - 3D models
  - Textures
  - Icons
  - Sound effects
  - Particle effects

## Configuration
- Centralized configuration files for:
  - Item stats and attributes
  - Game mechanics
  - UI elements
  - Level progression

## Development Guidelines
1. All new features should include:
   - TypeScript interfaces
   - Unit tests
   - Documentation updates

2. Code Style:
   - Use TypeScript for type safety
   - Follow object-oriented principles
   - Maintain modular architecture

3. Testing:
   - Write tests before implementation
   - Maintain high coverage
   - Include edge cases

4. Asset Creation:
   - Follow naming conventions
   - Optimize for performance
   - Include metadata 