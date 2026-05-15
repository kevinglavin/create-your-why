// Single source of truth for tunable game parameters.
// Edit these to retune balance without touching gameplay logic.

import * as THREE from 'three';

export const WORLD = {
    width: 20,   // x extent (-10 .. 10)
    depth: 36,   // z extent (-18 .. 18)
};

// World bounds (inset slightly so entities don't clip the fence visually)
export const BOUNDS = {
    minX: -WORLD.width / 2 + 0.5,
    maxX:  WORLD.width / 2 - 0.5,
    minZ: -WORLD.depth / 2 + 0.5,
    maxZ:  WORLD.depth / 2 - 0.5,
};

// Coop sits near the top of the playfield; entrance opens toward the player (-z).
export const COOP = {
    position: new THREE.Vector3(0, 0, 14),
    width: 7,
    depth: 5,
    height: 3.2,
    doorWidth: 3.2,
    entranceZ: 11.4,        // z value of the trigger zone (just inside the doorway)
    entranceRadius: 2.0,    // matches spec
    interiorMinZ: 12.5,     // safe ducks get parked between this z and coop back
    interiorMaxZ: 15.0,
};

export const TIMER_SECONDS = 120;

export const DUCK_COUNT = { white: 6, brown: 3, black: 3 };
export const DUCK_TOTAL = DUCK_COUNT.white + DUCK_COUNT.brown + DUCK_COUNT.black;

export const DUCK_COLORS = {
    white: 0xf5efe2,
    brown: 0x6b4524,
    black: 0x222024,
    beak:  0xe6a72b,
};

export const DOG = {
    accel: 14,
    maxSpeed: 5.5,
    friction: 6,
    radius: 0.6,
    bodyColor: 0xfaf6ec,
    earColor: 0xd9cfb8,
};

export const DUCK = {
    // Boid neighborhood
    neighborRadius: 3.0,
    separationRadius: 1.2,

    // Dog influence
    pressureRadius: 4.0,    // dog within this -> ducks get pressured + avoid
    panicRadius: 1.5,       // dog within this -> scatter

    // Speed by state
    maxSpeed: { loose: 1.2, pressured: 2.2, scattered: 3.2 },

    // Boid weights (tuned for "feels like herding, not chasing")
    separationWeight: 2.4,
    cohesionWeight: 0.55,
    alignmentWeight: 0.35,
    avoidanceWeight: 3.6,
    coopAttractionWeight: 1.4,
    wanderWeight: 0.25,

    // Force capping
    maxForce: 6.0,

    // Timing
    scatterMin: 1.5,
    scatterMax: 2.5,
    calmDown: 3.0,          // pressured -> loose after dog distant for this long

    // Body radius for separation/collision
    radius: 0.35,
};

export const HERDING = {
    dogBehindThreshold: 0.4, // dot product threshold (per spec)
};

export const COLORS = {
    groundDirt: 0x8a6a3e,
    groundStraw: 0xbf9d4f,
    fencePost: 0x7a5a36,
    fenceRail: 0xa07d4e,
    bale: 0xd9b35d,
    coopRoof: 0x9c4a2a,
    coopFrame: 0x6b4524,
    coopMesh: 0x2a1f12,
    treeTrunk: 0x4a3220,
    treeLeaves: 0x3f6a3a,
    waterTub: 0x405b8a,
    feedBucket: 0x6b6055,
};

// Day/dusk lighting endpoints
export const LIGHT = {
    day: {
        sky:    0xfff2c8,
        ground: 0x6b5836,
        sun:    0xfff0c8,
        ambient: 1.0,
        sunIntensity: 1.4,
    },
    dusk: {
        sky:    0x6a4878,
        ground: 0x2e2030,
        sun:    0xe07840,
        ambient: 0.55,
        sunIntensity: 0.8,
    },
};
