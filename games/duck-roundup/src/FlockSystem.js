// FlockSystem: per-frame boid + dog-pressure + coop-attraction forces.
//
// Herding model — the part that makes the game feel like herding rather than chasing:
//
//  * Ducks always do basic boid behavior (separation + cohesion + alignment).
//  * When the dog is within `pressureRadius`, ducks add a force AWAY from the dog
//    proportional to how close he is.
//  * If the dog is BEHIND the flock relative to the coop entrance (the dot of
//    flock-from-dog and direction-to-coop > 0.4), ducks gain a gentle attraction
//    toward the coop entrance — this is the "shepherd push" sweet spot.
//  * If the dog is IN FRONT of the flock relative to the coop, the same dot is
//    negative and the coop attraction flips, pushing the ducks away from the coop.
//    That punishes the player for getting between the flock and the goal.
//  * If the dog gets within `panicRadius` (or charges in fast), every nearby duck
//    enters the SCATTERED state for 1.5–2.5s and scatters outward from the
//    flock center.
//  * After the dog backs off, ducks gradually calm down (pressured -> loose).

import * as THREE from 'three';
import { DUCK, HERDING, COOP } from './constants.js';
import { STATE } from './DuckAgent.js';

export class FlockSystem {
    constructor() {
        this._tmp = new THREE.Vector3();
        this._sep = new THREE.Vector3();
        this._coh = new THREE.Vector3();
        this._ali = new THREE.Vector3();
        this._avoid = new THREE.Vector3();
        this._coop = new THREE.Vector3();
        this._wander = new THREE.Vector3();
        this._flockCenter = new THREE.Vector3();
        this._toCoop = new THREE.Vector3();
        this._fromDog = new THREE.Vector3();
    }

    update(dt, ducks, dog) {
        // Compute flock center over active ducks
        let activeCount = 0;
        this._flockCenter.set(0, 0, 0);
        for (const d of ducks) {
            if (d.state === STATE.SAFE) continue;
            this._flockCenter.add(d.position);
            activeCount++;
        }
        if (activeCount === 0) return;
        this._flockCenter.divideScalar(activeCount);

        // Direction from flock to coop
        this._toCoop.copy(COOP.position).setY(0).sub(this._flockCenter);
        const flockToCoopDist = this._toCoop.length();
        if (flockToCoopDist > 0.001) this._toCoop.divideScalar(flockToCoopDist);

        // Is dog "behind" the flock relative to the coop?
        // Vector from dog to flock; if it's aligned with toCoop, dog is on the coop's opposite side -> behind.
        this._fromDog.copy(this._flockCenter).sub(dog.position);
        const fromDogLen = this._fromDog.length();
        if (fromDogLen > 0.001) this._fromDog.divideScalar(fromDogLen);
        const dogBehindDot = this._fromDog.dot(this._toCoop); // 1 = perfectly behind, -1 = in front

        const dogPressing = this._distXZ(dog.position, this._flockCenter) < DUCK.pressureRadius * 1.5;
        const dogIsBehind = dogPressing && dogBehindDot > HERDING.dogBehindThreshold;
        const dogIsBlocking = dogPressing && dogBehindDot < -HERDING.dogBehindThreshold;

        // Dog motion magnitude — used to amplify scatter triggers when he charges in.
        const dogSpeed = Math.hypot(dog.velocity.x, dog.velocity.z);
        const dogCharging = dogSpeed > 3.5;

        for (const d of ducks) {
            if (d.state === STATE.SAFE) continue;

            this._sep.set(0, 0, 0);
            this._coh.set(0, 0, 0);
            this._ali.set(0, 0, 0);
            this._avoid.set(0, 0, 0);
            this._coop.set(0, 0, 0);
            this._wander.set(0, 0, 0);

            // --- Boid neighbor pass ---
            let neighborCount = 0;
            const cohSum = new THREE.Vector3();
            const aliSum = new THREE.Vector3();
            for (const o of ducks) {
                if (o === d || o.state === STATE.SAFE) continue;
                const dx = d.position.x - o.position.x;
                const dz = d.position.z - o.position.z;
                const dist = Math.hypot(dx, dz);
                if (dist < DUCK.separationRadius && dist > 0.0001) {
                    // Separation: stronger when closer (1/dist²)
                    const k = 1 / (dist * dist);
                    this._sep.x += (dx / dist) * k;
                    this._sep.z += (dz / dist) * k;
                }
                if (dist < DUCK.neighborRadius) {
                    cohSum.add(o.position);
                    aliSum.add(o.velocity);
                    neighborCount++;
                }
            }
            if (neighborCount > 0) {
                cohSum.divideScalar(neighborCount);
                this._coh.copy(cohSum).sub(d.position);
                this._coh.y = 0;
                _safeNormalize(this._coh);
                aliSum.divideScalar(neighborCount);
                this._ali.copy(aliSum);
                this._ali.y = 0;
                _safeNormalize(this._ali);
            }

            // --- Dog avoidance ---
            const dxd = d.position.x - dog.position.x;
            const dzd = d.position.z - dog.position.z;
            const dogDist = Math.hypot(dxd, dzd);

            if (dogDist < DUCK.pressureRadius) {
                d.markPressured();
                if (dogDist > 0.0001) {
                    const closeness = (DUCK.pressureRadius - dogDist) / DUCK.pressureRadius;
                    this._avoid.x = (dxd / dogDist) * closeness;
                    this._avoid.z = (dzd / dogDist) * closeness;
                }

                // Scatter trigger: very close OR dog charging in fast
                if ((dogDist < DUCK.panicRadius) || (dogCharging && dogDist < DUCK.panicRadius * 1.6)) {
                    if (d.state !== STATE.SCATTERED) d.triggerScatter();
                }
            } else {
                d.markCalm(dt);
            }

            // --- Coop attraction (the herding magic) ---
            // Always present a small attraction so a flock that drifts close
            // doesn't stall, but the strong push only activates when the dog
            // is behind the flock. If dog is between flock and coop, FLIP the
            // sign so player learns "don't stand between them and the goal".
            const distToCoop = this._distXZ(d.position, COOP.position);

            if (d.state !== STATE.SCATTERED) {
                this._coop.copy(COOP.position).setY(0).sub(d.position);
                _safeNormalize(this._coop);

                let coopWeight = 0.15; // small ambient pull so they drift gently
                if (dogIsBehind) {
                    // Strong shepherd push, scaled by how strong the alignment is
                    coopWeight = 1.0 * Math.min(1, (dogBehindDot - HERDING.dogBehindThreshold) / 0.6 + 0.4);
                } else if (dogIsBlocking) {
                    // Player is in the wrong place — push ducks AWAY from coop
                    coopWeight = -0.8;
                }

                // Once close to the coop entrance and dog is anywhere behind/away,
                // give a final approach pull so the last few feet aren't frustrating.
                if (distToCoop < COOP.entranceRadius * 2.2 && dogBehindDot > 0) {
                    coopWeight = Math.max(coopWeight, 0.9);
                }

                this._coop.multiplyScalar(coopWeight);
            }

            // --- Scatter outward force when scattered ---
            if (d.state === STATE.SCATTERED) {
                const ox = d.position.x - this._flockCenter.x;
                const oz = d.position.z - this._flockCenter.z;
                const olen = Math.hypot(ox, oz);
                if (olen > 0.0001) {
                    this._avoid.x += (ox / olen) * 1.2;
                    this._avoid.z += (oz / olen) * 1.2;
                } else {
                    // Center duck — pick a random direction
                    const a = Math.random() * Math.PI * 2;
                    this._avoid.x += Math.cos(a) * 1.2;
                    this._avoid.z += Math.sin(a) * 1.2;
                }
            }

            // --- Wander (small idle motion when fully calm) ---
            if (d.state === STATE.LOOSE && Math.random() < 0.04) {
                this._wander.x = (Math.random() - 0.5);
                this._wander.z = (Math.random() - 0.5);
            }

            // --- Combine ---
            const f = d.pendingForce;
            f.x = this._sep.x * DUCK.separationWeight
                + this._coh.x * DUCK.cohesionWeight
                + this._ali.x * DUCK.alignmentWeight
                + this._avoid.x * DUCK.avoidanceWeight
                + this._coop.x * DUCK.coopAttractionWeight
                + this._wander.x * DUCK.wanderWeight;
            f.z = this._sep.z * DUCK.separationWeight
                + this._coh.z * DUCK.cohesionWeight
                + this._ali.z * DUCK.alignmentWeight
                + this._avoid.z * DUCK.avoidanceWeight
                + this._coop.z * DUCK.coopAttractionWeight
                + this._wander.z * DUCK.wanderWeight;

            // Cap force so a stack of close neighbors doesn't yeet a duck
            const fLen = Math.hypot(f.x, f.z);
            if (fLen > DUCK.maxForce) {
                const k = DUCK.maxForce / fLen;
                f.x *= k;
                f.z *= k;
            }
        }
    }

    _distXZ(a, b) {
        const dx = a.x - b.x;
        const dz = a.z - b.z;
        return Math.hypot(dx, dz);
    }
}

function _safeNormalize(v) {
    const l = Math.hypot(v.x, v.z);
    if (l > 0.0001) {
        v.x /= l;
        v.z /= l;
    } else {
        v.x = 0;
        v.z = 0;
    }
}
