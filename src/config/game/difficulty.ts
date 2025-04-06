export type Difficulty = 'easy' | 'normal' | 'hard';

export interface RatConfig {
    baseHealth: number;
    baseDamage: number;
    baseSpeed: number;
    zigzagAmplitude: number;
    zigzagFrequency: number;
    spawnInterval: number;
    explosiveRatChance: number;
    explosionRadius: number;
    explosionDamage: number;
}

export interface LevelProgression {
    healthMultiplier: number;
    damageMultiplier: number;
    speedMultiplier: number;
    zigzagMultiplier: number;
    spawnRateMultiplier: number;
    explosiveRatMultiplier: number;
}

const difficultySettings: Record<Difficulty, RatConfig> = {
    easy: {
        baseHealth: 1,
        baseDamage: 1,
        baseSpeed: 0.8,
        zigzagAmplitude: 0.2,
        zigzagFrequency: 0.1,
        spawnInterval: 20000,
        explosiveRatChance: 0,
        explosionRadius: 2,
        explosionDamage: 5
    },
    normal: {
        baseHealth: 2,
        baseDamage: 2,
        baseSpeed: 1,
        zigzagAmplitude: 0.3,
        zigzagFrequency: 0.2,
        spawnInterval: 15000,
        explosiveRatChance: 0,
        explosionRadius: 2.5,
        explosionDamage: 8
    },
    hard: {
        baseHealth: 3,
        baseDamage: 3,
        baseSpeed: 1.5,
        zigzagAmplitude: 0.4,
        zigzagFrequency: 0.3,
        spawnInterval: 12000,
        explosiveRatChance: 0.01,
        explosionRadius: 3,
        explosionDamage: 10
    }
};

const levelProgression: LevelProgression = {
    healthMultiplier: 1.005,
    damageMultiplier: 1.01,
    speedMultiplier: 1.005,
    zigzagMultiplier: 1.005,
    spawnRateMultiplier: 0.995,
    explosiveRatMultiplier: 1.02
};

export { difficultySettings, levelProgression }; 