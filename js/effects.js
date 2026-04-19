/**
 * effects.js
 * Subliminal glitch events for the Yuugata no Piano audio artifact.
 */

class EffectsEngine {
    constructor() {
        this.initialized = false;
        this.glitchLayer = null;
        this.boundAudio = new WeakSet();
        this.triggeredIndices = new Set();
        this.lastTime = 0;
        this.globalDelaySeconds = 0.5;
        this.timestamps = [
            35, 38.5, 42, 45.5, 63, 66.5, 70, 76.5,
            91, 92.5, 94, 98, 133.5, 137, 140.5,
            144, 145.5, 169, 170, 171
        ];
    }

    init() {
        this.bindSubliminalGlitch();
        this.initialized = true;
    }

    ensureGlitchLayer() {
        if (this.glitchLayer) return this.glitchLayer;

        const layer = document.createElement('div');
        layer.className = 'subliminal-glitch-layer';
        layer.setAttribute('aria-hidden', 'true');
        document.body.appendChild(layer);
        this.glitchLayer = layer;
        return layer;
    }

    isYuugataArtifact(audioEl) {
        const exhibit = audioEl.closest('.exhibit');
        if (exhibit?.dataset.id === 'AUD_TAPE_47') return true;

        const source = audioEl.currentSrc || audioEl.querySelector('source')?.src || '';
        const decoded = decodeURIComponent(source).toLowerCase();
        return decoded.includes('yuugata') || decoded.includes('夕方のピアノ');
    }

    bindSubliminalGlitch() {
        const bindCandidates = () => {
            document.querySelectorAll('.exhibit audio').forEach((audioEl) => this.bindAudio(audioEl));
        };

        bindCandidates();

        const museumFloor = document.getElementById('museum-floor');
        if (!museumFloor) return;

        const observer = new MutationObserver(() => bindCandidates());
        observer.observe(museumFloor, { childList: true, subtree: true });
    }

    bindAudio(audioEl) {
        if (this.boundAudio.has(audioEl)) return;
        if (!this.isYuugataArtifact(audioEl)) return;

        this.boundAudio.add(audioEl);
        this.ensureGlitchLayer();

        audioEl.addEventListener('timeupdate', () => this.onAudioTimeUpdate(audioEl));
        audioEl.addEventListener('seeking', () => this.onAudioSeek(audioEl));
        audioEl.addEventListener('ended', () => {
            this.triggeredIndices.clear();
            this.lastTime = 0;
        });
    }

    onAudioSeek(audioEl) {
        if (audioEl.currentTime < this.lastTime) {
            this.triggeredIndices.clear();
        }
        this.lastTime = audioEl.currentTime;
    }

    onAudioTimeUpdate(audioEl) {
        const current = audioEl.currentTime;

        // If playback jumps backwards, allow all timestamps to trigger again.
        if (current + 0.5 < this.lastTime) {
            this.triggeredIndices.clear();
        }
        this.lastTime = current;

        this.timestamps.forEach((stamp, index) => {
            if (this.triggeredIndices.has(index)) return;
            const delayedStamp = stamp + this.globalDelaySeconds;
            if (Math.abs(current - delayedStamp) > 0.3) return;

            this.triggeredIndices.add(index);
            const next = this.timestamps[index + 1] ?? Infinity;
            const delayedNext = next + this.globalDelaySeconds;
            const duration = (delayedNext - delayedStamp) > 3 ? 1700 : 400;
            this.spawnWordBurst(duration);
        });
    }

    spawnWordBurst(durationMs) {
        const layer = this.ensureGlitchLayer();
        const burstCount = 2 + Math.floor(Math.random() * 4);
        const nodes = [];

        for (let i = 0; i < burstCount; i++) {
            const node = document.createElement('span');
            node.className = 'subliminal-glitch-word';
            node.textContent = '死ね';

            const size = 48 + Math.floor(Math.random() * 150);
            const x = Math.random() * window.innerWidth;
            const y = Math.random() * window.innerHeight;
            const angle = -18 + Math.random() * 36;
            const jitterSpeed = 60 + Math.floor(Math.random() * 70);

            node.style.left = `${x}px`;
            node.style.top = `${y}px`;
            node.style.fontSize = `${size}px`;
            node.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
            node.style.animationDuration = `${jitterSpeed}ms`;

            layer.appendChild(node);
            nodes.push(node);
        }

        window.setTimeout(() => {
            nodes.forEach((node) => node.remove());
        }, durationMs);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const effects = new EffectsEngine();
    effects.init();
});
