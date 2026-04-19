/**
 * interaction.js
 * Physical object interaction: dragging, focusing, fullscreen, and closing exhibits
 */

class InteractionHandler {
    constructor() {
        this.dragState = {
            isDragging: false,
            currentElement: null,
            offsetX: 0,
            offsetY: 0
        };
        this.zIndexCounter = 100;
        this.fullscreenActive = null;
        this.humStarted = false;
        this.fullscreenRestore = null;
        this.focusedSizeRestore = null;
        this.closedExhibits = new Map(); // id -> exhibit data
        this.exhibitStore = null; // Reference to exhibits array from engine
    }

    /**
     * Initialize all event listeners
     */
    init() {
        // Dragging
        document.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.onDragMove(e));
        document.addEventListener('mouseup', (e) => this.endDrag(e));
        
        // Focus & double-click (delegated)
        document.addEventListener('click', (e) => this.handleClick(e));
        document.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
        
        // Close button
        document.addEventListener('click', (e) => this.handleClose(e));
        
        // Escape to exit fullscreen
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.fullscreenActive) {
                this.exitFullscreen();
            }
        });

        this.bindBackgroundHum();
        this.bindWakeToggle();
        this.bindStatusClock();
    }

    bindWakeToggle() {
        const wakeToggle = document.getElementById('wake-toggle');
        if (!wakeToggle) return;

        wakeToggle.addEventListener('click', () => {
            const isActive = document.documentElement.classList.toggle('negative-mode');
            wakeToggle.textContent = isActive ? '>> [ WAKE UP ]' : '>> [ SLEEP ]';
            wakeToggle.setAttribute('aria-pressed', String(isActive));
        });
    }

    bindStatusClock() {
        const statusTime = document.getElementById('status-time');
        if (!statusTime) return;

        const renderTime = () => {
            const now = new Date();
            const hh = String(now.getHours()).padStart(2, '0');
            const mm = String(now.getMinutes()).padStart(2, '0');
            const ss = String(now.getSeconds()).padStart(2, '0');
            statusTime.textContent = `[ ${hh}:${mm}:${ss} ]`;
        };

        renderTime();
        window.setInterval(renderTime, 1000);
    }

    /**
     * Start a very quiet white-noise hum on first user interaction.
     */
    bindBackgroundHum() {
        const unlockHum = () => {
            this.startBackgroundHum();
            window.removeEventListener('pointerdown', unlockHum);
            window.removeEventListener('keydown', unlockHum);
            window.removeEventListener('touchstart', unlockHum);
        };

        window.addEventListener('pointerdown', unlockHum, { once: true });
        window.addEventListener('keydown', unlockHum, { once: true });
        window.addEventListener('touchstart', unlockHum, { once: true });
    }

    /**
     * Generate and play looped white noise.
     */
    startBackgroundHum() {
        if (this.humStarted) return;

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        this.humStarted = true;

        const audioContext = new AudioContextClass();
        const durationSeconds = 2;
        const buffer = audioContext.createBuffer(1, audioContext.sampleRate * durationSeconds, audioContext.sampleRate);
        const channelData = buffer.getChannelData(0);

        for (let i = 0; i < channelData.length; i++) {
            channelData[i] = (Math.random() * 2 - 1) * 0.12;
        }

        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0.008;

        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        source.start();

        this.backgroundHum = { audioContext, source, gainNode };
    }

    /**
     * Start dragging an exhibit (from header)
     */
    startDrag(e) {
        const header = e.target.closest('.exhibit-header');
        if (!header) return;
        
        const exhibit = header.closest('.exhibit');
        if (!exhibit) return;

        // Don't drag if clicking the close button
        if (e.target.closest('.exhibit-close')) return;

        e.preventDefault();
        this.dragState.isDragging = true;
        this.dragState.currentElement = exhibit;

        // Calculate offset from mouse to element's corner
        const rect = exhibit.getBoundingClientRect();
        this.dragState.offsetX = e.clientX - rect.left;
        this.dragState.offsetY = e.clientY - rect.top;

        // Bring to front
        this.focusExhibit(exhibit);
        exhibit.classList.add('dragging');
        document.body.classList.add('no-select');
    }

    /**
     * Handle dragging movement
     */
    onDragMove(e) {
        if (!this.dragState.isDragging || !this.dragState.currentElement) return;

        const el = this.dragState.currentElement;
        const parentRect = el.offsetParent?.getBoundingClientRect() || { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
        let x = e.clientX - this.dragState.offsetX - parentRect.left;
        let y = e.clientY - this.dragState.offsetY - parentRect.top;

        // Constrain to parent bounds (museum floor)
        x = Math.max(0, Math.min(x, parentRect.width - el.offsetWidth));
        y = Math.max(0, Math.min(y, parentRect.height - el.offsetHeight));

        el.style.left = x + 'px';
        el.style.top = y + 'px';
    }

    /**
     * End dragging
     */
    endDrag(e) {
        if (this.dragState.currentElement) {
            this.dragState.currentElement.classList.remove('dragging');
        }
        this.dragState.isDragging = false;
        this.dragState.currentElement = null;
        document.body.classList.remove('no-select');
    }

    /**
     * Handle single click (focus to top z-index)
     */
    handleClick(e) {
        const exhibit = e.target.closest('.exhibit');
        if (!exhibit) return;
        
        // Only focus if not dragging and not fullscreen
        if (!this.dragState.isDragging && !this.fullscreenActive) {
            this.focusExhibit(exhibit);
        }
    }

    /**
     * Handle double-click (fullscreen toggle)
     */
    handleDoubleClick(e) {
        const exhibit = e.target.closest('.exhibit');
        if (!exhibit) return;
        
        e.preventDefault();
        this.toggleFullscreen(exhibit);
    }

    /**
     * Bring an exhibit to the front (highest z-index)
     */
    focusExhibit(exhibitEl) {
        this.zIndexCounter++;
        exhibitEl.style.zIndex = this.zIndexCounter;
    }

    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen(exhibit) {
        if (this.fullscreenActive === exhibit) {
            this.exitFullscreen();
        } else {
            this.enterFullscreen(exhibit);
        }
    }

    /**
     * Enter fullscreen mode
     */
    enterFullscreen(exhibit) {
        // Exit previous fullscreen if any
        if (this.fullscreenActive) {
            this.exitFullscreen();
        }

        this.fullscreenRestore = {
            parent: exhibit.parentNode,
            nextSibling: exhibit.nextSibling
        };

        const rect = exhibit.getBoundingClientRect();
        const targetHeight = Math.min(700, Math.floor(window.innerHeight * 0.9));
        const scaledWidth = Math.round(rect.width * (targetHeight / Math.max(rect.height, 1)));
        const maxAllowedWidth = Math.floor(window.innerWidth * 0.92);
        const targetWidth = Math.min(Math.max(scaledWidth, 360), maxAllowedWidth);

        this.focusedSizeRestore = {
            width: exhibit.style.width,
            height: exhibit.style.height,
            maxWidth: exhibit.style.maxWidth
        };

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'fullscreen-overlay';
        overlay.dataset.target = exhibit.dataset.id;
        overlay.addEventListener('click', () => this.exitFullscreen());
        document.body.appendChild(overlay);

        // Move the exhibit above every other layer so the overlay only dims the background.
        document.body.appendChild(exhibit);

        // Add fullscreen class to exhibit
        exhibit.style.width = targetWidth + 'px';
        exhibit.style.height = targetHeight + 'px';
        exhibit.style.maxWidth = 'none';
        exhibit.classList.add('fullscreen');
        this.fullscreenActive = exhibit;
        document.body.classList.add('fullscreen-active');
        
        console.log(`🔍 Fullscreen: ${exhibit.dataset.id}`);
    }

    /**
     * Exit fullscreen mode
     */
    exitFullscreen() {
        if (!this.fullscreenActive) return;

        const overlay = document.querySelector('.fullscreen-overlay');
        if (overlay) overlay.remove();

        if (this.fullscreenActive) {
            this.fullscreenActive.classList.remove('fullscreen');

            if (this.focusedSizeRestore) {
                this.fullscreenActive.style.width = this.focusedSizeRestore.width;
                this.fullscreenActive.style.height = this.focusedSizeRestore.height;
                this.fullscreenActive.style.maxWidth = this.focusedSizeRestore.maxWidth;
            }

            if (this.fullscreenRestore?.parent) {
                if (this.fullscreenRestore.nextSibling) {
                    this.fullscreenRestore.parent.insertBefore(this.fullscreenActive, this.fullscreenRestore.nextSibling);
                } else {
                    this.fullscreenRestore.parent.appendChild(this.fullscreenActive);
                }
            }
        }
        this.fullscreenActive = null;
        this.fullscreenRestore = null;
        this.focusedSizeRestore = null;
        document.body.classList.remove('fullscreen-active');
    }

    /**
     * Handle close button click
     */
    handleClose(e) {
        const closeBtn = e.target.closest('.exhibit-close');
        if (!closeBtn) return;

        e.stopPropagation(); // Prevent drag/focus
        
        const exhibit = closeBtn.closest('.exhibit');
        if (exhibit) {
            if (this.fullscreenActive === exhibit) {
                this.exitFullscreen();
                return;
            }

            const exhibitId = exhibit.dataset.id;
            const title = exhibit.querySelector('.header-marquee span')?.textContent || 'Unknown';

            // Store exhibit data for restoration
            this.closedExhibits.set(exhibitId, {
                id: exhibitId,
                title: title,
                element: exhibit
            });
            
            // Create desktop icon
            this.createDesktopIcon(exhibitId, title);
            
            // Fade out and remove
            exhibit.style.opacity = '0';
            exhibit.style.transform = 'scale(0.8)';
            setTimeout(() => {
                exhibit.remove();
                console.log(`❌ Removed: ${exhibitId}`);
            }, 200);
        }
    }

    /**
     * Create a desktop icon for a closed exhibit
     */
    createDesktopIcon(exhibitId, title) {
        let desktopIcons = document.getElementById('desktop-icons');
        if (!desktopIcons) {
            const museumFloor = document.getElementById('museum-floor');
            if (!museumFloor) return;
            desktopIcons = document.createElement('div');
            desktopIcons.id = 'desktop-icons';
            desktopIcons.setAttribute('aria-label', 'closed artifacts');
            museumFloor.appendChild(desktopIcons);
        }

        const icon = document.createElement('div');
        icon.className = 'desktop-icon';
        icon.dataset.id = exhibitId;
        icon.textContent = title;
        icon.title = title;
        
        // Double-click to restore
        icon.addEventListener('dblclick', (e) => {
            e.preventDefault();
            this.restoreExhibit(exhibitId);
            icon.remove();
        });
        
        desktopIcons.appendChild(icon);
    }

    /**
     * Restore a closed exhibit from desktop icon
     */
    restoreExhibit(exhibitId) {
        const closed = this.closedExhibits.get(exhibitId);
        if (!closed) return;

        const museumFloor = document.getElementById('museum-floor');
        const desktopIcons = document.getElementById('desktop-icons');
        if (!museumFloor) return;

        // Re-add the exhibit to the floor, before the desktop-icons container
        const exhibit = closed.element;
        exhibit.style.opacity = '1';
        exhibit.style.transform = 'scale(1)';
        
        if (desktopIcons) {
            museumFloor.insertBefore(exhibit, desktopIcons);
        } else {
            museumFloor.appendChild(exhibit);
        }

        this.closedExhibits.delete(exhibitId);
        console.log(`✨ Restored: ${exhibitId}`);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    const handler = new InteractionHandler();
    handler.init();
    console.log('✓ Interaction handler initialized');
});
