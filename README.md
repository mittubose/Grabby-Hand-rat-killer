# Grabby Hand Rat Killer

A fast-paced 3D first-person shooter where you use grappling hands to swing around and eliminate rats while solving puzzles.

## Features

- **Dual Grappling Hands**: Left and right hands with different colors and abilities
- **Dynamic Combat**: Shoot projectiles to eliminate rats
- **Boss Battles**: Face challenging boss rats that appear after killing enough regular rats
- **Progression System**:
  - Level up by gaining XP from kills
  - Earn coins to purchase upgrades
  - Unlock better projectile damage and speed
  - Increase health capacity
- **Puzzle System**:
  - Solve sliding puzzles to progress
  - Each level features a new puzzle challenge
  - Wall-mounted puzzle interface
- **Advanced Movement**:
  - Grappling hook swinging mechanics
  - Running and jumping
  - Smooth camera controls
- **Minimap System**:
  - Shows player position and orientation
  - Displays rats as red dots
  - Boss rats appear as larger markers with health bars
- **Visual Effects**:
  - Blood particles on hits
  - Glowing projectiles
  - Boss warning effects
  - Damage direction indicators

## Tech Stack

- Three.js for 3D rendering
- TypeScript for type-safe code
- Vite for fast development and building

## Setup

1. Clone the repository:
```bash
git clone https://github.com/mittubose/Grabby-Hand-rat-killer.git
cd Grabby-Hand-rat-killer
```

2. Install dependencies:
```bash
npm install
```

3. Run development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Controls

- **WASD**: Movement
- **Mouse**: Look around
- **Left Click**: Left hand shoot/grapple
- **Right Click**: Right hand shoot/grapple
- **Space**: Jump
- **Shift**: Run
- **E**: Interact with puzzles and objects
- **Esc**: Pause menu

## Game Mechanics

1. **Combat**:
   - Shoot rats with projectiles from both hands
   - Each hit deals damage based on your projectile damage stat
   - Regular rats take 2 hits, boss rats take multiple hits

2. **Progression**:
   - Kill rats to gain XP and coins
   - Level up to unlock puzzle challenges
   - Use coins in the shop to upgrade:
     - Projectile damage
     - Projectile speed
     - Health capacity

3. **Puzzle System**:
   - Solve sliding puzzles to progress
   - Each puzzle must be completed to access the shop
   - Puzzles increase in difficulty as you level up

4. **Boss Fights**:
   - Boss rats spawn every 10 regular rat kills
   - Bosses have health bars and deal more damage
   - Defeating bosses grants more XP and coins

## Development

The game is built with modern web technologies and follows best practices for game development:

- Modular code structure
- Type-safe implementation
- Efficient 3D rendering
- Smooth physics and controls
- Responsive design

## License

MIT License - feel free to use and modify for your own projects! 