// DogController: large white Great Pyrenees. Smooth accel/decel toward
// either the InputController's aimTarget (touch raycast point) or its
// aimVector (joystick / WASD). Cannot grab/attack ducks — pure positional pressure.

import * as THREE from 'three';
import { DOG, BOUNDS } from './constants.js';
import { resolveCollisions } from './collision.js';

export class DogController {
    constructor(scene, obstacles) {
        this.scene = scene;
        this.obstacles = obstacles;

        this.position = new THREE.Vector3(0, 0, -14);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.facing = new THREE.Vector3(0, 0, 1);
        this.radius = DOG.radius;

        this.mesh = this._buildMesh();
        this.mesh.position.copy(this.position);
        scene.add(this.mesh);

        this._tmpDir = new THREE.Vector3();
        this._tmpDesired = new THREE.Vector3();
    }

    _buildMesh() {
        const group = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({ color: DOG.bodyColor, roughness: 0.85 });
        const accentMat = new THREE.MeshStandardMaterial({ color: DOG.earColor, roughness: 0.9 });
        const noseMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });

        // Body — fluffy elongated box
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.7, 1.55), bodyMat);
        body.position.y = 0.55;
        body.castShadow = true;
        group.add(body);

        // Chest fluff
        const chest = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), bodyMat);
        chest.position.set(0, 0.55, 0.7);
        chest.scale.set(1.0, 0.85, 0.6);
        chest.castShadow = true;
        group.add(chest);

        // Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.6, 0.7), bodyMat);
        head.position.set(0, 0.85, 1.05);
        head.castShadow = true;
        group.add(head);

        // Snout
        const snout = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.45), bodyMat);
        snout.position.set(0, 0.75, 1.55);
        snout.castShadow = true;
        group.add(snout);

        // Nose
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), noseMat);
        nose.position.set(0, 0.78, 1.78);
        group.add(nose);

        // Ears
        for (const sx of [-1, 1]) {
            const ear = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, 0.22), accentMat);
            ear.position.set(sx * 0.28, 1.0, 0.85);
            ear.rotation.z = sx * 0.2;
            ear.castShadow = true;
            group.add(ear);
        }

        // Tail (fluffy)
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.55), bodyMat);
        tail.position.set(0, 0.7, -0.85);
        tail.rotation.x = -0.4;
        tail.castShadow = true;
        group.add(tail);

        // Legs
        for (const [sx, sz] of [[-1,1],[1,1],[-1,-1],[1,-1]]) {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.4, 0.22), bodyMat);
            leg.position.set(sx * 0.28, 0.2, sz * 0.45);
            leg.castShadow = true;
            group.add(leg);
        }

        return group;
    }

    setPosition(x, z) {
        this.position.set(x, 0, z);
        this.velocity.set(0, 0, 0);
        this.facing.set(0, 0, 1);
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = 0;
    }

    update(dt, input) {
        // Compute desired direction (unit-ish) from whichever input mode is active.
        this._tmpDesired.set(0, 0, 0);

        if (input.activeMode === 'pointer' && input.aimTarget) {
            this._tmpDir.copy(input.aimTarget).sub(this.position);
            this._tmpDir.y = 0;
            const dist = this._tmpDir.length();
            if (dist > 0.15) {
                this._tmpDir.divideScalar(dist);
                // Slow down within a small arrival radius for snappier feel
                const arrival = Math.min(1, dist / 1.5);
                this._tmpDesired.copy(this._tmpDir).multiplyScalar(arrival);
            }
        } else if (input.activeMode === 'joystick' || input.activeMode === 'keys') {
            this._tmpDesired.set(input.aimVector.x, 0, input.aimVector.y);
            // aimVector magnitude is already 0..1 for joystick, =1 for keys
        }

        // Steering: accelerate toward (desired * maxSpeed); apply friction otherwise.
        const desiredVel = this._tmpDesired.multiplyScalar(DOG.maxSpeed);
        // delta toward desired
        const dvx = desiredVel.x - this.velocity.x;
        const dvz = desiredVel.z - this.velocity.z;

        // Use higher of acceleration and friction so stop responds quickly.
        const isMoving = this._tmpDesired.lengthSq() > 0.0001;
        const rate = isMoving ? DOG.accel : DOG.friction;

        const dvLen = Math.hypot(dvx, dvz);
        const maxStep = rate * dt;
        if (dvLen <= maxStep || dvLen < 0.001) {
            this.velocity.x = desiredVel.x;
            this.velocity.z = desiredVel.z;
        } else {
            const k = maxStep / dvLen;
            this.velocity.x += dvx * k;
            this.velocity.z += dvz * k;
        }

        // Cap speed
        const speed = Math.hypot(this.velocity.x, this.velocity.z);
        if (speed > DOG.maxSpeed) {
            const k = DOG.maxSpeed / speed;
            this.velocity.x *= k;
            this.velocity.z *= k;
        }

        // Integrate
        this.position.x += this.velocity.x * dt;
        this.position.z += this.velocity.z * dt;

        // Bounds clamp
        if (this.position.x < BOUNDS.minX) { this.position.x = BOUNDS.minX; this.velocity.x = 0; }
        if (this.position.x > BOUNDS.maxX) { this.position.x = BOUNDS.maxX; this.velocity.x = 0; }
        if (this.position.z < BOUNDS.minZ) { this.position.z = BOUNDS.minZ; this.velocity.z = 0; }
        if (this.position.z > BOUNDS.maxZ) { this.position.z = BOUNDS.maxZ; this.velocity.z = 0; }

        // Slide around obstacles
        resolveCollisions(this.position, this.radius, this.obstacles);

        // Update facing (only when moving meaningfully)
        if (speed > 0.05) {
            this.facing.set(this.velocity.x / speed, 0, this.velocity.z / speed);
            this.mesh.rotation.y = Math.atan2(this.facing.x, this.facing.z);
        }

        this.mesh.position.copy(this.position);

        // Subtle bob on movement
        const bobAmt = Math.min(1, speed / DOG.maxSpeed);
        this.mesh.position.y = Math.sin(performance.now() * 0.012) * 0.04 * bobAmt;
    }
}
