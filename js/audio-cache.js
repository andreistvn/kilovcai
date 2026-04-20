/**
 * audio-cache.js
 * Fetches hotlinked audio files and swaps sources to local Blobs.
 */

class AudioCache {
    constructor() {
        this.urlCache = new Map(); 
        this.inflight = new Map(); 
        window.addEventListener('beforeunload', () => this.dispose());
    }

    async getCachedObjectUrl(remoteUrl) {
        if (!remoteUrl) return null;
        if (this.urlCache.has(remoteUrl)) return this.urlCache.get(remoteUrl);
        if (this.inflight.has(remoteUrl)) return this.inflight.get(remoteUrl);

        const request = this.fetchToObjectUrl(remoteUrl)
            .then((objectUrl) => {
                if (objectUrl) {
                    this.urlCache.set(remoteUrl, objectUrl);
                }
                this.inflight.delete(remoteUrl);
                return objectUrl;
            })
            .catch((error) => {
                console.warn('Audio cache fetch failed:', remoteUrl, error);
                this.inflight.delete(remoteUrl);
                return null;
            });

        this.inflight.set(remoteUrl, request);
        return request;
    }

    async fetchToObjectUrl(remoteUrl) {
        const response = await fetch(remoteUrl, { mode: 'cors', cache: 'force-cache' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    }

    hasPlaybackStarted(audioEl) {
        return audioEl.dataset.playbackStarted === '1' || audioEl.currentTime > 0 || !audioEl.paused;
    }

    async patchAudioElement(audioEl) {
        if (!audioEl || audioEl.dataset.cachePatched === '1') return;
        audioEl.dataset.cachePatched = '1';
        audioEl.preload = 'auto';

        audioEl.addEventListener('play', () => {
            audioEl.dataset.playbackStarted = '1';
        }, { once: true });

        const sourceEl = audioEl.querySelector('source');
        const remoteUrl = (sourceEl?.src || audioEl.currentSrc || audioEl.src || '').trim();
        if (!remoteUrl) return;

        const cachedUrl = await this.getCachedObjectUrl(remoteUrl);
        
        // If playback started during the fetch, don't swap (prevents audio pop/jump)
        if (!cachedUrl || this.hasPlaybackStarted(audioEl)) {
            return;
        }

        if (sourceEl) {
            sourceEl.src = cachedUrl;
        } else {
            audioEl.src = cachedUrl;
        }

        // Hard reset to point to the new Blob URL
        audioEl.load();
    }

    patchAllAudioIn(root = document) {
        root.querySelectorAll('.exhibit audio').forEach((audioEl) => {
            this.patchAudioElement(audioEl);
        });
    }

    dispose() {
        this.urlCache.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
        this.urlCache.clear();
        this.inflight.clear();
    }
}

const audioCache = new AudioCache();

document.addEventListener('DOMContentLoaded', () => {
    audioCache.patchAllAudioIn(document);
    const museumFloor = document.getElementById('museum-floor');
    if (!museumFloor) return;

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (!(node instanceof Element)) return;
                if (node.matches?.('.exhibit audio')) {
                    audioCache.patchAudioElement(node);
                    return;
                }
                audioCache.patchAllAudioIn(node);
            });
        });
    });

    observer.observe(museumFloor, { childList: true, subtree: true });
});