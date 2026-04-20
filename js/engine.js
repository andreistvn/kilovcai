/**
 * ═══════════════════════════════════════════════════════════
 * MUSEUM ENGINE
 * Interactive Digital Archive — Core Rendering & Interaction
 * ═══════════════════════════════════════════════════════════
 */

class MuseumEngine {
    constructor(catalogPath = './data/exhibits.json') {
        this.catalogPath = catalogPath;
        this.exhibits = [];
        this.floor = document.getElementById('museum-floor');
    }

    /**
     * Load the exhibits catalog from JSON
     */
    async loadCatalog() {
        try {
            let data;

            // Prefer file-based catalog so edits in data/exhibits.json are picked up immediately.
            try {
                const response = await fetch(this.catalogPath);
                if (!response.ok) {
                    throw new Error(`Failed to fetch: ${response.status}`);
                }
                data = await response.json();
                console.log('📦 Loaded exhibits from file');
            } catch (fetchError) {
                // Fall back to embedded data for file:// local testing.
                const embeddedScript = document.getElementById('exhibits-data');
                if (!embeddedScript) {
                    throw fetchError;
                }
                data = JSON.parse(embeddedScript.textContent);
                console.log('📦 Loaded exhibits from embedded data');
            }

            this.exhibits = data.exhibits || [];
            this.render();
        } catch (error) {
            console.error('❌ Museum loading failed:', error);
            this.floor.innerHTML = `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: #b0c4de;">Error loading exhibits. Check console.</div>`;
        }
    }

    /**
     * Render all exhibits to the floor
     */
    render() {
        const desktopIcons = this.floor.querySelector('#desktop-icons');
        this.floor.innerHTML = ''; // Clear floor
        this.exhibits.forEach((exhibit, index) => {
            const exhibitEl = this.createExhibitElement(exhibit, index);
            this.floor.appendChild(exhibitEl);
        });

        // Preserve the desktop icon tray so closed artifacts always have a visible target.
        if (desktopIcons) {
            this.floor.appendChild(desktopIcons);
        }
    }

    /**
     * Create a single exhibit window element
     */
    createExhibitElement(exhibit, index) {
        const div = document.createElement('div');
        div.className = 'exhibit';
        div.dataset.id = exhibit.id;
        div.dataset.type = exhibit.type;
        div.tabindex = index;

        // Position from JSON, with random fallback bounded by the floor area.
        const floorWidth = this.floor?.clientWidth ?? window.innerWidth;
        const floorHeight = this.floor?.clientHeight ?? window.innerHeight;
        const x = exhibit.pos?.x ?? Math.random() * Math.max(60, floorWidth - 320);
        const y = exhibit.pos?.y ?? Math.random() * Math.max(60, floorHeight - 260);
        
        div.style.left = x + 'px';
        div.style.top = y + 'px';
        div.style.zIndex = 10 + index;

        // Build inner content
        let contentHTML = `
            <div class="exhibit-header">
                <span class="header-marquee"><span>${exhibit.title || '[UNNAMED]'}</span></span>
                <span class="exhibit-close" data-id="${exhibit.id}">[ + ]</span>
            </div>
            <div class="exhibit-content">
        `;

        // Render based on type
        switch (exhibit.type) {
            case 'image':
                contentHTML += `<img src="${exhibit.content}" alt="${exhibit.title}" loading="lazy" class="exhibit-image">`;
                break;

            case 'text':
                contentHTML += `<pre class="exhibit-text">${this.escapeHtml(exhibit.content)}</pre>`;
                break;

            case 'audio':
                contentHTML += `
                    <div class="exhibit-audio-container">
                        <audio controls class="exhibit-audio" preload="auto">
                            <source src="${exhibit.content}" type="audio/mpeg">
                            Your browser does not support the audio element.
                        </audio>
                    </div>
                `;
                break;

            default:
                contentHTML += `<p>${this.escapeHtml(exhibit.content)}</p>`;
        }

        // Add description
        if (exhibit.description) {
            contentHTML += `<p class="exhibit-description">${this.escapeHtml(exhibit.description)}</p>`;
        }

        // Add metadata (optional)
        if (exhibit.metadata) {
            contentHTML += `<div class="exhibit-metadata">`;
            if (exhibit.metadata.date) {
                contentHTML += `<div>[ ${exhibit.metadata.date} ]</div>`;
            }
            if (exhibit.metadata.source) {
                contentHTML += `<div>src: <code>${this.escapeHtml(exhibit.metadata.source)}</code></div>`;
            }
            contentHTML += `</div>`;
        }

        contentHTML += `</div>`;

        div.innerHTML = contentHTML;

        return div;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

/**
 * Initialize the museum on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    const museum = new MuseumEngine('./data/exhibits.json');
    museum.loadCatalog();
    console.log('🏛️ Museum Engine initialized. The floor is ready for exploration.');
});
