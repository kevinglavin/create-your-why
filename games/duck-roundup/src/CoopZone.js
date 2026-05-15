// CoopZone: a trigger zone just inside the doorway. When an active duck enters
// the zone, mark it SAFE, park it in a tidy interior slot, and notify the caller
// (so GameManager can update the safe count and check win condition).

import * as THREE from 'three';
import { COOP } from './constants.js';
import { STATE } from './DuckAgent.js';

export class CoopZone {
    constructor() {
        this._slots = this._buildSlots();
        this._slotIndex = 0;
        this._tmp = new THREE.Vector3();
    }

    _buildSlots() {
        // Tidy 4x3 grid inside the coop interior
        const slots = [];
        const cx = COOP.position.x;
        const cz = COOP.position.z;
        const cols = 4;
        const rows = 3;
        const innerW = COOP.width - 1.6;
        const innerD = COOP.depth - 1.6;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = cx - innerW / 2 + (c + 0.5) * (innerW / cols);
                // Park them deeper into the coop (back rows first)
                const z = cz + innerD / 2 - (r + 0.5) * (innerD / rows);
                slots.push({ x, z });
            }
        }
        return slots;
    }

    /**
     * Check a duck. If it crossed into the entrance zone, mark it safe.
     * Returns true if this duck just transitioned to SAFE.
     */
    checkEntry(duck) {
        if (duck.state === STATE.SAFE) return false;

        // Trigger volume: a circle around the entrance (door is at z = COOP.entranceZ - small)
        // We treat "inside" as having z >= entranceZ AND |x| < doorWidth/2 + small
        const insideX = Math.abs(duck.position.x - COOP.position.x) < COOP.doorWidth / 2 + 0.2;
        const insideZ = duck.position.z >= COOP.entranceZ;
        if (insideX && insideZ) {
            const slot = this._slots[this._slotIndex % this._slots.length];
            this._slotIndex++;
            this._tmp.set(slot.x, 0, slot.z);
            duck.setSafe(this._tmp);
            return true;
        }
        return false;
    }

    reset() {
        this._slotIndex = 0;
    }
}
