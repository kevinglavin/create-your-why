// Entry point: wires the canvas + UI to the GameManager and starts the loop.

import { GameManager } from './GameManager.js';
import { UIManager } from './UIManager.js';

const canvas = document.getElementById('game-canvas');
const ui = new UIManager(document);
const game = new GameManager(canvas, ui);

ui.onStart(() => game.start());
ui.onReplay(() => game.start());
ui.onPauseToggle(() => game.togglePause());

// Boot the renderer immediately so the start screen has a scene behind it.
game.boot();

// rAF loop. dt clamped at 50ms so backgrounding doesn't fling the simulation.
let prev = performance.now();
function frame(now) {
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    game.update(dt);
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
