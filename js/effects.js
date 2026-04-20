/**
 * effects.js
 * Subliminal glitch events.
 */

class EffectsEngine {
    constructor() {
        this.initialized = false;
        this.glitchLayer = null;
        this.boundAudio = new WeakSet();
        this.clockAudio = null;
        this.nextIndex = 0;
        this.rafHandle = 0;
        this.lastMediaTime = 0;

        this.globalDelaySeconds = 0;
        this.timestamps = [
            35, 38.5, 42, 45.5, 63, 66.5, 70, 77,
            91, 92.5, 94, 98, 133.5, 137, 140.5,
            144, 145.5, 169, 170, 171
        ];
        this.delayedTimestamps = this.timestamps.map((t) => t + this.globalDelaySeconds);
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
        return decodeURIComponent(source).toLowerCase().includes('yuugata');
    }

    bindSubliminalGlitch() {
        const bindCandidates = () => {
            document.querySelectorAll('.exhibit audio').forEach((audioEl) => this.bindAudio(audioEl));
        };
        bindCandidates();
        const museumFloor = document.getElementById('museum-floor');
        if (museumFloor) {
            new MutationObserver(() => bindCandidates()).observe(museumFloor, { childList: true, subtree: true });
        }
    }

    bindAudio(audioEl) {
        if (this.boundAudio.has(audioEl) || !this.isYuugataArtifact(audioEl)) return;
        this.boundAudio.add(audioEl);
        this.ensureGlitchLayer();

        // Re-anchor when playback actually starts or is seeked
        audioEl.addEventListener('playing', () => this.onPlaybackStarted(audioEl));
        audioEl.addEventListener('pause', () => this.onPlaybackPaused(audioEl));
        audioEl.addEventListener('waiting', () => this.onPlaybackPaused(audioEl));
        audioEl.addEventListener('seeked', () => this.onAudioSeek(audioEl));
        
        audioEl.addEventListener('ended', () => {
            this.stopAudioClock(audioEl);
            this.nextIndex = 0;
        });

        if (!audioEl.paused && !audioEl.ended) {
            this.onPlaybackStarted(audioEl);
        }
    }

    onPlaybackStarted(audioEl) {
        if (this.clockAudio && this.clockAudio !== audioEl) {
            this.stopAudioClock(this.clockAudio);
        }
        this.clockAudio = audioEl;
        this.reanchorFromElement(audioEl);
        this.startTimelineLoop(audioEl);
    }

    onPlaybackPaused(audioEl) {
        if (this.clockAudio === audioEl) this.stopTimelineLoop();
    }

    onAudioSeek(audioEl) {
        if (this.clockAudio !== audioEl) return;
        this.reanchorFromElement(audioEl);
    }

    stopAudioClock(audioEl) {
        if (audioEl === this.clockAudio) {
            this.stopTimelineLoop();
            this.clockAudio = null;
        }
    }

    reanchorFromElement(audioEl) {
        const current = audioEl.currentTime;
        this.lastMediaTime = current;
        this.nextIndex = this.findNextIndex(current);
    }

    findNextIndex(timeSeconds) {
        for (let i = 0; i < this.delayedTimestamps.length; i++) {
            if (this.delayedTimestamps[i] > timeSeconds) return i;
        }
        return this.delayedTimestamps.length;
    }

    startTimelineLoop(audioEl) {
        if (this.rafHandle) return;

        const tick = () => {
            if (this.clockAudio !== audioEl || audioEl.paused || audioEl.ended) {
                this.stopTimelineLoop();
                return;
            }

            const current = audioEl.currentTime;

            // Seek-back or timeline reset: recompute next target index.
            if (current + 0.05 < this.lastMediaTime) {
                this.nextIndex = this.findNextIndex(current);
            }

            if (current > this.lastMediaTime) {
                this.processTimestampCrossings(this.lastMediaTime, current);
                this.lastMediaTime = current;
            }

            this.rafHandle = window.requestAnimationFrame(tick);
        };

        this.rafHandle = window.requestAnimationFrame(tick);
    }

    stopTimelineLoop() {
        if (this.rafHandle) {
            window.cancelAnimationFrame(this.rafHandle);
            this.rafHandle = 0;
        }
    }

    processTimestampCrossings(previous, current) {
        while (this.nextIndex < this.delayedTimestamps.length) {
            const target = this.delayedTimestamps[this.nextIndex];
            if (previous < target && current >= target) {
                const next = this.delayedTimestamps[this.nextIndex + 1] ?? Infinity;
                const duration = (next - target) > 3 ? 1700 : 400;
                this.spawnWordBurst(duration);
                this.nextIndex += 1;
                continue;
            }
            if (current >= target) {
                this.nextIndex += 1;
                continue;
            }
            break;
        }
    }

    spawnWordBurst(durationMs) {
        const layer = this.ensureGlitchLayer();
        document.body.classList.add('glitch-active');
        const burstCount = 2 + Math.floor(Math.random() * 4);
        const nodes = [];

        for (let i = 0; i < burstCount; i++) {
            const node = document.createElement('span');
            node.className = 'subliminal-glitch-word';
            node.textContent = '死ね';

            const size = 64 + Math.floor(Math.random() * 120);
            const x = Math.random() * window.innerWidth;
            const y = Math.random() * window.innerHeight;
            const angle = -15 + Math.random() * 30;

            node.style.left = `${x}px`;
            node.style.top = `${y}px`;
            node.style.fontSize = `${size}px`;
            node.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
            node.style.animationDuration = `${60 + Math.random() * 40}ms`;

            layer.appendChild(node);
            nodes.push(node);
        }

        window.setTimeout(() => {
            nodes.forEach(n => n.remove());
            // Only remove global class if no other bursts are active (optional)
            if (layer.children.length === 0) {
                document.body.classList.remove('glitch-active');
            }
        }, durationMs);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new EffectsEngine().init();
});