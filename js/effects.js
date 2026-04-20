/**
 * effects.js
 * Subliminal glitch events for the Yuugata no Piano audio artifact.
 */

class EffectsEngine {
    constructor() {
        this.initialized = false;
        this.glitchLayer = null;
        this.boundAudio = new WeakSet();
        this.lastTime = 0;
        this.clockHandle = 0;
        this.clockAudio = null;
        this.globalDelaySeconds = 0;
        this.maxTriggerLatenessSeconds = 0.15;
        this.timestamps = [
            35, 38.5, 42, 45.5, 63, 66.5, 70, 76.5,
            91, 92.5, 94, 98, 133.5, 137, 140.5,
            144, 145.5, 169, 170, 171
        ];
        this.delayedTimestamps = this.timestamps.map((stamp) => stamp + this.globalDelaySeconds);
        this.nextIndex = 0;
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

        audioEl.addEventListener('play', () => this.startAudioClock(audioEl));
        audioEl.addEventListener('pause', () => this.stopAudioClock(audioEl));
        audioEl.addEventListener('seeking', () => this.onAudioSeek(audioEl));
        audioEl.addEventListener('seeked', () => {
            this.lastTime = audioEl.currentTime;
        });
        audioEl.addEventListener('ended', () => {
            this.stopAudioClock(audioEl);
            this.nextIndex = 0;
            this.lastTime = 0;
        });

        if (!audioEl.paused && !audioEl.ended) {
            this.startAudioClock(audioEl);
        }
    }

    startAudioClock(audioEl) {
        if (this.clockAudio && this.clockAudio !== audioEl) {
            this.stopAudioClock(this.clockAudio);
        }

        this.clockAudio = audioEl;
        this.lastTime = audioEl.currentTime;
        this.nextIndex = this.findNextIndex(this.lastTime);

        if (this.clockHandle) {
            window.cancelAnimationFrame(this.clockHandle);
            this.clockHandle = 0;
        }

        const tick = () => {
            if (!this.clockAudio || this.clockAudio !== audioEl || audioEl.paused || audioEl.ended) {
                this.stopAudioClock(audioEl);
                return;
            }

            this.onAudioTimeUpdate(audioEl);
            this.clockHandle = window.requestAnimationFrame(tick);
        };

        this.clockHandle = window.requestAnimationFrame(tick);
    }

    stopAudioClock(audioEl) {
        if (audioEl && this.clockAudio && audioEl !== this.clockAudio) return;

        if (this.clockHandle) {
            window.cancelAnimationFrame(this.clockHandle);
            this.clockHandle = 0;
        }

        if (!audioEl || this.clockAudio === audioEl) {
            this.clockAudio = null;
        }
    }

    onAudioSeek(audioEl) {
        this.nextIndex = this.findNextIndex(audioEl.currentTime);
        this.lastTime = audioEl.currentTime;
    }

    findNextIndex(timeSeconds) {
        for (let i = 0; i < this.delayedTimestamps.length; i++) {
            if (this.delayedTimestamps[i] > timeSeconds) return i;
        }
        return this.delayedTimestamps.length;
    }

onAudioTimeUpdate(audioEl) {
    if (audioEl.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

    const current = audioEl.currentTime;
    
    // Look-ahead: If we are within a very small window of the NEXT timestamp, 
    // trigger it now rather than waiting for the next frame tick.
    while (this.nextIndex < this.delayedTimestamps.length) {
        const target = this.delayedTimestamps[this.nextIndex];
        
        // If we've passed the timestamp or are within 16ms (1 frame) of it
        if (current >= target - 0.016) { 
            const lateness = current - target;

            // Only trigger if we aren't horribly out of sync
            if (lateness <= this.maxTriggerLatenessSeconds) {
                const next = this.delayedTimestamps[this.nextIndex + 1] ?? Infinity;
                const duration = (next - target) > 3 ? 1700 : 400;
                this.spawnWordBurst(duration);
            }
            this.nextIndex++;
        } else {
            break; // Not reached yet
        }
    }
    this.lastTime = current;
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
