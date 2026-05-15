// DuckAgent: per-duck state and visual mesh.
// Movement integration is driven by FlockSystem, which writes a force into
// `pendingForce` each frame. DuckAgent.update() integrates and renders.

import * as THREE from 'three';
import { DUCK, DUCK_COLORS, BOUNDS } from './constants.js';
import { resolveCollisions } from './collision.js';

const STATE = {
    LOOSE: 'loose',
    PRESSURED: 'pressured',
    SCATTERED: 'scattered',
    SAFE: 'safe',
};

export class DuckAgent {
    constructor(scene, color, x, z, obstacles) {
        this.scene = scene;
        this.obstacles = obstacles;

        this.position = new THREE.Vector3(x, 0, z);
        this.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4);
        this.pendingForce = new THREE.Vector3();
        this.facing = new THREE.Vector3(0, 0, 1);
        this.radius = DUCK.radius;
        this.colorKey = color;

        this.state = STATE.LOOSE;
        this.panic = 0;
        this.scatterTimer = 0;
        this.calmTimer = 0;
        this.bobOffset = Math.random() * Math.PI * 2;

        this.mesh = this._buildMesh(color);
        this.mesh.position.copy(this.position);
        scene.add(this.mesh);
    }

    _buildMesh(color) {
        const group = new THREE.Group();
        const bodyColor = DUCK_COLORS[color] ?? DUCK_COLORS.white;
        const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.8 });
        const beakMat = new THREE.MeshStandardMaterial({ color: DUCK_COLORS.beak, roughness: 0.6 });

        // Body: stretched ellipsoid
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8), bodyMat);
        body.scale.set(0.9, 0.75, 1.2);
        body.position.y = 0.32;
        body.castShadow = true;
        group.add(body);

        // Tail nub
        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.18, 6), bodyMat);
        tail.position.set(0, 0.42, -0.38);
        tail.rotation.x = Math.PI / 2;
        group.add(tail);

        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), bodyMat);
        head.position.set(0, 0.55, 0.3);
        head.castShadow = true;
        group.add(head);

        // Beak
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 6), beakMat);
        beak.position.set(0, 0.52, 0.46);
        beak.rotation.x = Math.PI / 2;
        group.add(beak);

        // Tiny eye dots (just for character — not too dark to avoid spook factor)
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.4 });
        for (const sx of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), eyeMat);
            eye.position.set(sx * 0.08, 0.58, 0.42);
            group.add(eye);
        }

        return group;
    }

    triggerScatter() {
        if (this.state === STATE.SAFE) return;
        this.state = STATE.SCATTERED;
        this.panic = 1;
        this.scatterTimer = DUCK.scatterMin + Math.random() * (DUCK.scatterMax - DUCK.scatterMin);
    }

    markPressured() {
        if (this.state === STATE.SAFE) return;
        if (this.state === STATE.LOOSE) this.state = STATE.PRESSURED;
        this.calmTimer = 0;
    }

    markCalm(dt) {
        if (this.state !== STATE.PRESSURED) return;
        this.calmTimer += dt;
        if (this.calmTimer >= DUCK.calmDown) {
            this.state = STATE.LOOSE;
            this.calmTimer = 0;
        }
    }

    setSafe(parkPosition) {
        this.state = STATE.SAFE;
        this.panic = 0;
        this.velocity.set(0, 0, 0);
        this.pendingForce.set(0, 0, 0);
        this.position.copy(parkPosition);
        this.mesh.position.copy(this.position);
        // Face toward back of coop
        this.facing.set(0, 0, 1);
        this.mesh.rotation.y = 0;
    }

    update(dt) {
        if (this.state === STATE.SAFE) {
            // Static, but a small idle bob so they look alive
            this.mesh.position.y = Math.sin(performance.now() * 0.004 + this.bobOffset) * 0.02;
            return;
        }

        // Tick state timers
        if (this.state === STATE.SCATTERED) {
            this.scatterTimer -= dt;
            if (this.scatterTimer <= 0) {
                this.state = STATE.PRESSURED;
                this.scatterTimer = 0;
            }
        }
        // Panic decays continuously toward 0 (calm-down 3s by spec)
        this.panic = Math.max(0, this.panic - dt / DUCK.calmDown);

        // Integrate force into velocity
        this.velocity.x += this.pendingForce.x * dt;
        this.velocity.z += this.pendingForce.z * dt;

        // Apply mild damping so they don't slide forever
        const damping = this.state === STATE.SCATTERED ? 1.5 : 2.5;
        this.velocity.x -= this.velocity.x * damping * dt;
        this.velocity.z -= this.velocity.z * damping * dt;

        // Cap to state max speed
        const maxSpeed = DUCK.maxSpeed[this.state] ?? DUCK.maxSpeed.loose;
        const speed = Math.hypot(this.velocity.x, this.velocity.z);
        if (speed > maxSpeed) {
            const k = maxSpeed / speed;
            this.velocity.x *= k;
            this.velocity.z *= k;
        }

        // Integrate position
        this.position.x += this.velocity.x * dt;
        this.position.z += this.velocity.z * dt;

        // Bounds clamp
        if (this.position.x < BOUNDS.minX) { this.position.x = BOUNDS.minX; this.velocity.x *= -0.4; }
        if (this.position.x > BOUNDS.maxX) { this.position.x = BOUNDS.maxX; this.velocity.x *= -0.4; }
        if (this.position.z < BOUNDS.minZ) { this.position.z = BOUNDS.minZ; this.velocity.z *= -0.4; }
        if (this.position.z > BOUNDS.maxZ) { this.position.z = BOUNDS.maxZ; this.velocity.z *= -0.4; }

        resolveCollisions(this.position, this.radius, this.obstacles);

        // Facing
        if (speed > 0.05) {
            this.facing.set(this.velocity.x / speed, 0, this.velocity.z / speed);
            this.mesh.rotation.y = Math.atan2(this.facing.x, this.facing.z);
        }

        // Apply transform
        this.mesh.position.x = this.position.x;
        this.mesh.position.z = this.position.z;
        // Waddle bob, faster when panicked
        const bobFreq = 6 + this.panic * 8;
        this.mesh.position.y = Math.abs(Math.sin(performance.now() * 0.001 * bobFreq + this.bobOffset)) * 0.05 * Math.min(1, speed);

        // Reset force accumulator for next frame
        this.pendingForce.set(0, 0, 0);
    }
}

export { STATE };
