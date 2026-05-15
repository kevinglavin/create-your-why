// GameManager: owns scene/camera/renderer, builds entities, runs the game loop,
// tracks win/lose/timer/pause, and animates lighting from day to dusk.

import * as THREE from 'three';
import {
    WORLD, COOP, TIMER_SECONDS, DUCK_COUNT, DUCK_TOTAL, LIGHT,
} from './constants.js';
import { LevelBuilder } from './LevelBuilder.js';
import { DogController } from './DogController.js';
import { DuckAgent, STATE } from './DuckAgent.js';
import { FlockSystem } from './FlockSystem.js';
import { CoopZone } from './CoopZone.js';
import { InputController } from './InputController.js';

const STATE_GAME = {
    BOOT: 'boot',
    READY: 'ready',
    PLAYING: 'playing',
    PAUSED: 'paused',
    WIN: 'win',
    LOSE: 'lose',
};

export class GameManager {
    constructor(canvas, ui) {
        this.canvas = canvas;
        this.ui = ui;
        this.state = STATE_GAME.BOOT;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xb6dceb);
        this.scene.fog = new THREE.Fog(0xb6dceb, 25, 55);

        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            powerPreference: 'high-performance',
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
        this._configureCameraForViewport();

        // Lights
        this.ambient = new THREE.HemisphereLight(LIGHT.day.sky, LIGHT.day.ground, LIGHT.day.ambient);
        this.scene.add(this.ambient);

        this.sun = new THREE.DirectionalLight(LIGHT.day.sun, LIGHT.day.sunIntensity);
        this.sun.position.set(-10, 18, -6);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.set(1024, 1024);
        this.sun.shadow.camera.left = -WORLD.width / 2 - 4;
        this.sun.shadow.camera.right = WORLD.width / 2 + 4;
        this.sun.shadow.camera.top = WORLD.depth / 2 + 4;
        this.sun.shadow.camera.bottom = -WORLD.depth / 2 - 4;
        this.sun.shadow.camera.near = 0.5;
        this.sun.shadow.camera.far = 60;
        this.scene.add(this.sun);

        this.input = new InputController(canvas, this.camera, document);

        // Built lazily in boot()
        this.level = null;
        this.dog = null;
        this.ducks = [];
        this.flock = new FlockSystem();
        this.coopZone = new CoopZone();

        this.timeLeft = TIMER_SECONDS;
        this.safeCount = 0;

        // Resize
        window.addEventListener('resize', () => this._onResize(), { passive: true });
        // Visibility change pause
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.state === STATE_GAME.PLAYING) this.togglePause();
        });
    }

    _onResize() {
        this._configureCameraForViewport();
    }

    _configureCameraForViewport() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.renderer.setSize(w, h, false);
        this.camera.aspect = w / h;
        // Tighter FOV when the viewport is wide so the play field still frames vertically
        const portrait = h >= w;
        this.camera.fov = portrait ? 48 : 38;
        // Place camera south of the field, slightly above, looking toward the coop.
        // World z=14 is the coop; -18 is south. Camera sits below south fence elevated.
        this.camera.position.set(0, 24, -22);
        this.camera.lookAt(0, 0, 4);
        this.camera.updateProjectionMatrix();
    }

    boot() {
        if (this.state !== STATE_GAME.BOOT) return;
        const built = new LevelBuilder(this.scene).build();
        this.level = built;
        this.dog = new DogController(this.scene, built.obstacles);
        this._spawnDucks(built.obstacles);
        this.state = STATE_GAME.READY;
        this.renderer.render(this.scene, this.camera);
    }

    _spawnDucks(obstacles) {
        for (const d of this.ducks) this.scene.remove(d.mesh);
        this.ducks = [];

        const palette = [];
        for (let i = 0; i < DUCK_COUNT.white; i++) palette.push('white');
        for (let i = 0; i < DUCK_COUNT.brown; i++) palette.push('brown');
        for (let i = 0; i < DUCK_COUNT.black; i++) palette.push('black');
        // Shuffle
        for (let i = palette.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [palette[i], palette[j]] = [palette[j], palette[i]];
        }

        // Spawn ducks in a loose cluster around (0, -10..-8)
        for (let i = 0; i < DUCK_TOTAL; i++) {
            const ang = Math.random() * Math.PI * 2;
            const r = Math.sqrt(Math.random()) * 2.4;
            const x = Math.cos(ang) * r + (Math.random() - 0.5) * 1.0;
            const z = Math.sin(ang) * r - 10 + (Math.random() - 0.5) * 1.0;
            this.ducks.push(new DuckAgent(this.scene, palette[i], x, z, obstacles));
        }
    }

    start() {
        // Reset everything for a fresh round
        this.coopZone.reset();
        this.safeCount = 0;
        this.timeLeft = TIMER_SECONDS;
        // Reposition dog
        this.dog.setPosition(0, -14);
        // Respawn ducks (cleaner than trying to un-park safe ones)
        this._spawnDucks(this.level.obstacles);
        this.ui.setDuckCount(0);
        this.ui.setTimer(this.timeLeft);
        this.ui.setPaused(false);
        this._setLightingT(0);
        this.input.setEnabled(true);
        this.state = STATE_GAME.PLAYING;
    }

    togglePause() {
        if (this.state === STATE_GAME.PLAYING) {
            this.state = STATE_GAME.PAUSED;
            this.input.setEnabled(false);
            this.ui.setPaused(true);
        } else if (this.state === STATE_GAME.PAUSED) {
            this.state = STATE_GAME.PLAYING;
            this.input.setEnabled(true);
            this.ui.setPaused(false);
        }
    }

    update(dt) {
        if (this.state === STATE_GAME.PLAYING) {
            this.input.update();
            this.dog.update(dt, this.input);
            this.flock.update(dt, this.ducks, this.dog);

            for (const d of this.ducks) {
                d.update(dt);
                if (d.state !== STATE.SAFE && this.coopZone.checkEntry(d)) {
                    this.safeCount++;
                    this.ui.setDuckCount(this.safeCount);
                }
            }

            this.timeLeft -= dt;
            this.ui.setTimer(this.timeLeft);
            this._setLightingT(1 - Math.max(0, this.timeLeft) / TIMER_SECONDS);

            if (this.safeCount >= DUCK_TOTAL) {
                this.state = STATE_GAME.WIN;
                this.input.setEnabled(false);
                this.ui.showWin();
            } else if (this.timeLeft <= 0) {
                this.timeLeft = 0;
                this.state = STATE_GAME.LOSE;
                this.input.setEnabled(false);
                this.ui.showLose(this.safeCount);
            }
        }

        this.renderer.render(this.scene, this.camera);
    }

    _setLightingT(t) {
        // t in [0, 1]: 0 = day, 1 = dusk. Lerp the lights and background.
        const day = LIGHT.day, dusk = LIGHT.dusk;
        // Curve so the early game stays bright and the dusk shift accelerates near the end
        const k = Math.pow(Math.max(0, Math.min(1, t)), 1.4);

        const skyColor = new THREE.Color(day.sky).lerp(new THREE.Color(dusk.sky), k);
        const groundColor = new THREE.Color(day.ground).lerp(new THREE.Color(dusk.ground), k);
        this.ambient.color.copy(skyColor);
        this.ambient.groundColor.copy(groundColor);
        this.ambient.intensity = day.ambient + (dusk.ambient - day.ambient) * k;

        const sunColor = new THREE.Color(day.sun).lerp(new THREE.Color(dusk.sun), k);
        this.sun.color.copy(sunColor);
        this.sun.intensity = day.sunIntensity + (dusk.sunIntensity - day.sunIntensity) * k;

        // Background + fog match the sky
        const bg = new THREE.Color(0xb6dceb).lerp(new THREE.Color(0x4a3858), k);
        this.scene.background = bg;
        if (this.scene.fog) this.scene.fog.color.copy(bg);
    }
}
