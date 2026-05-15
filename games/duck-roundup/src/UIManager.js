// UIManager: thin wrapper around the DOM overlay (HUD + modals).
// Game systems call setDuckCount/setTimer/showWin/showLose/showPause; UI handles the rest.

import { DUCK_TOTAL } from './constants.js';

export class UIManager {
    constructor(doc) {
        this.doc = doc;
        this.duckCounter = doc.getElementById('duck-counter');
        this.timer       = doc.getElementById('timer');
        this.pauseBtn    = doc.getElementById('pause-btn');
        this.startScreen = doc.getElementById('start-screen');
        this.endScreen   = doc.getElementById('end-screen');
        this.endTitle    = doc.getElementById('end-title');
        this.endMessage  = doc.getElementById('end-message');
        this.pauseScreen = doc.getElementById('pause-screen');
        this.startBtn    = doc.getElementById('start-btn');
        this.replayBtn   = doc.getElementById('replay-btn');
        this.resumeBtn   = doc.getElementById('resume-btn');

        this._lastSafe = -1;
        this._lastSecs = -1;

        // Esc to pause on desktop
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this._pauseHandler) this._pauseHandler();
        });
    }

    onStart(handler) {
        this.startBtn.addEventListener('click', () => {
            this.startScreen.classList.add('hidden');
            this.endScreen.classList.add('hidden');
            handler();
        });
    }

    onReplay(handler) {
        this.replayBtn.addEventListener('click', () => {
            this.endScreen.classList.add('hidden');
            handler();
        });
    }

    onPauseToggle(handler) {
        this._pauseHandler = handler;
        this.pauseBtn.addEventListener('click', handler);
        this.resumeBtn.addEventListener('click', handler);
    }

    setDuckCount(safe) {
        if (safe === this._lastSafe) return;
        this._lastSafe = safe;
        this.duckCounter.textContent = `Ducks: ${safe} / ${DUCK_TOTAL}`;
    }

    setTimer(seconds) {
        const s = Math.max(0, Math.ceil(seconds));
        if (s === this._lastSecs) return;
        this._lastSecs = s;
        const mm = String(Math.floor(s / 60)).padStart(2, '0');
        const ss = String(s % 60).padStart(2, '0');
        this.timer.textContent = `Nightfall: ${mm}:${ss}`;
        this.timer.classList.toggle('urgent', s <= 15 && s > 0);
    }

    showWin() {
        this.endTitle.textContent = 'Safe!';
        this.endMessage.textContent = 'All ducks are safe in the coop.';
        this.endScreen.classList.remove('hidden');
    }

    showLose(safeCount) {
        this.endTitle.textContent = 'Nightfall';
        this.endMessage.textContent =
            `Nightfall came before the ducks were rounded up. (${safeCount} of ${DUCK_TOTAL} made it in.)`;
        this.endScreen.classList.remove('hidden');
    }

    setPaused(paused) {
        this.pauseScreen.classList.toggle('hidden', !paused);
    }
}
