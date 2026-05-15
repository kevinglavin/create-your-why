// InputController: produces a desired-direction vector for the dog from
// touch-drag (raycast onto ground), virtual joystick, or WASD/arrow keys.
//
// Design: there are two distinct input "modes" the dog can read:
//   - aimVector: a normalized 2D direction (joystick / keyboard)
//   - aimTarget: a world-space target point (touch drag projected onto ground)
// Whichever was most recently active wins. The dog smoothly accelerates
// either toward `aimTarget` or in the direction of `aimVector`.

import * as THREE from 'three';

const KEY_MAP = {
    'w': [0, -1], 'arrowup':    [0, -1],
    's': [0,  1], 'arrowdown':  [0,  1],
    'a': [-1, 0], 'arrowleft':  [-1, 0],
    'd': [1,  0], 'arrowright': [1,  0],
};

export class InputController {
    constructor(canvas, camera, doc) {
        this.canvas = canvas;
        this.camera = camera;
        this.doc = doc;

        // Output state read by DogController
        this.aimVector = new THREE.Vector2(0, 0);   // normalized; (x, z-in-world)
        this.aimTarget = null;                       // THREE.Vector3 on ground or null
        this.activeMode = 'none';                    // 'pointer' | 'joystick' | 'keys' | 'none'

        // Internals
        this._keys = new Set();
        this._raycaster = new THREE.Raycaster();
        this._groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        this._ndc = new THREE.Vector2();
        this._tmpHit = new THREE.Vector3();

        // Joystick state
        this._joystick = doc.getElementById('joystick');
        this._joyThumb = doc.getElementById('joystick-thumb');
        this._joyActive = false;
        this._joyPointerId = null;
        this._joyCenter = { x: 0, y: 0 };
        this._joyRadius = 55; // visual cap

        // Pointer-on-canvas state
        this._pointerActive = false;
        this._pointerId = null;

        this._enabled = false;
        this._bind();
    }

    setEnabled(on) {
        this._enabled = on;
        if (!on) this._reset();
    }

    _reset() {
        this.aimVector.set(0, 0);
        this.aimTarget = null;
        this.activeMode = 'none';
        this._joyActive = false;
        this._pointerActive = false;
        this._joyPointerId = null;
        this._pointerId = null;
        this._joyThumb.style.transform = 'translate(0, 0)';
    }

    _bind() {
        // Keyboard
        window.addEventListener('keydown', (e) => {
            const k = e.key.toLowerCase();
            if (KEY_MAP[k]) { this._keys.add(k); e.preventDefault(); }
        });
        window.addEventListener('keyup', (e) => {
            const k = e.key.toLowerCase();
            if (KEY_MAP[k]) this._keys.delete(k);
        });
        window.addEventListener('blur', () => this._keys.clear());

        // Joystick (uses pointer events; works for touch + mouse)
        this._joystick.addEventListener('pointerdown', (e) => {
            if (!this._enabled) return;
            this._joyActive = true;
            this._joyPointerId = e.pointerId;
            const rect = this._joystick.getBoundingClientRect();
            this._joyCenter.x = rect.left + rect.width / 2;
            this._joyCenter.y = rect.top + rect.height / 2;
            this._joystick.setPointerCapture(e.pointerId);
            this._updateJoystick(e.clientX, e.clientY);
            e.preventDefault();
        });
        this._joystick.addEventListener('pointermove', (e) => {
            if (!this._joyActive || e.pointerId !== this._joyPointerId) return;
            this._updateJoystick(e.clientX, e.clientY);
        });
        const joyEnd = (e) => {
            if (e.pointerId !== this._joyPointerId) return;
            this._joyActive = false;
            this._joyPointerId = null;
            this._joyThumb.style.transform = 'translate(0, 0)';
            if (this.activeMode === 'joystick') {
                this.aimVector.set(0, 0);
                this.activeMode = 'none';
            }
        };
        this._joystick.addEventListener('pointerup', joyEnd);
        this._joystick.addEventListener('pointercancel', joyEnd);

        // Canvas pointer drag -> raycast target
        this.canvas.addEventListener('pointerdown', (e) => {
            if (!this._enabled) return;
            this._pointerActive = true;
            this._pointerId = e.pointerId;
            this.canvas.setPointerCapture(e.pointerId);
            this._updatePointerTarget(e.clientX, e.clientY);
        });
        this.canvas.addEventListener('pointermove', (e) => {
            if (!this._pointerActive || e.pointerId !== this._pointerId) return;
            this._updatePointerTarget(e.clientX, e.clientY);
        });
        const ptrEnd = (e) => {
            if (e.pointerId !== this._pointerId) return;
            this._pointerActive = false;
            this._pointerId = null;
            if (this.activeMode === 'pointer') {
                this.aimTarget = null;
                this.activeMode = 'none';
            }
        };
        this.canvas.addEventListener('pointerup', ptrEnd);
        this.canvas.addEventListener('pointercancel', ptrEnd);

        // Block context menu on long-press (mobile)
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    _updateJoystick(clientX, clientY) {
        const dx = clientX - this._joyCenter.x;
        const dy = clientY - this._joyCenter.y;
        const len = Math.hypot(dx, dy);
        const cap = Math.min(len, this._joyRadius);
        const ux = (len > 0 ? dx / len : 0) * cap;
        const uy = (len > 0 ? dy / len : 0) * cap;
        this._joyThumb.style.transform = `translate(${ux}px, ${uy}px)`;

        // Deadzone
        const mag = Math.min(1, len / this._joyRadius);
        if (mag < 0.15) {
            this.aimVector.set(0, 0);
            return;
        }
        // Screen-y is forward in world (up on screen = -z away from camera)
        // Camera looks from -z toward +z, so screen-up -> world +z, screen-right -> world +x.
        // Our camera sits at +z looking toward -z? No: see GameManager — camera is at (0, 22, -18) looking at (0,0,4),
        // so the player view has +z going AWAY (up on screen) and +x going RIGHT.
        // Therefore screen dx maps to world +x, screen dy (down=positive) maps to world -z.
        const nx = dx / Math.max(len, 1);
        const ny = dy / Math.max(len, 1);
        this.aimVector.set(nx * mag, -ny * mag);
        this.activeMode = 'joystick';
        this.aimTarget = null;
    }

    _updatePointerTarget(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        this._ndc.x = ((clientX - rect.left) / rect.width)  * 2 - 1;
        this._ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        this._raycaster.setFromCamera(this._ndc, this.camera);
        const hit = this._raycaster.ray.intersectPlane(this._groundPlane, this._tmpHit);
        if (hit) {
            this.aimTarget = hit.clone();
            this.activeMode = 'pointer';
        }
    }

    update() {
        if (!this._enabled) return;

        // Keyboard wins if any key is currently down (overrides joystick/pointer momentarily).
        if (this._keys.size > 0) {
            let kx = 0, kz = 0;
            for (const k of this._keys) {
                kx += KEY_MAP[k][0];
                kz += KEY_MAP[k][1];
            }
            const len = Math.hypot(kx, kz);
            if (len > 0) {
                this.aimVector.set(kx / len, kz / len);
                this.activeMode = 'keys';
                this.aimTarget = null;
            }
        }
    }
}
