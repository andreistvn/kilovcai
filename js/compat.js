/**
 * compat.js
 * Hard gate for unsupported viewport sizes and touch-centric devices.
 */

(function () {
    const MIN_WIDTH = 1100;
    const MIN_HEIGHT = 700;

    function ensureWall() {
        let wall = document.getElementById('compat-wall');
        if (wall) return wall;

        wall = document.createElement('div');
        wall.id = 'compat-wall';
        wall.setAttribute('role', 'dialog');
        wall.setAttribute('aria-modal', 'true');
        wall.setAttribute('aria-live', 'polite');
        wall.innerHTML = [
            '<div class="compat-box">',
            '<h2>[ DESKTOP VIEW REQUIRED ]</h2>',
            '<p>This archive is currently locked on mobile and small viewports.</p>',
            '<p>Please reopen on a desktop display (min 1100x700) for now.</p>',
            '<p id="compat-size"></p>',
            '</div>'
        ].join('');

        document.body.appendChild(wall);
        return wall;
    }

    function isBlocked() {
        const tooSmall = window.innerWidth < MIN_WIDTH || window.innerHeight < MIN_HEIGHT;
        const coarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        const noHover = window.matchMedia && window.matchMedia('(hover: none)').matches;
        return tooSmall || (coarsePointer && noHover);
    }

    function renderStatus() {
        if (!document.body) return;

        const wall = ensureWall();
        const blocked = isBlocked();
        document.documentElement.classList.toggle('compat-blocked', blocked);

        const sizeText = wall.querySelector('#compat-size');
        if (sizeText) {
            sizeText.textContent = `Current viewport: ${window.innerWidth}x${window.innerHeight}`;
        }
    }

    function init() {
        renderStatus();
        window.addEventListener('resize', renderStatus);
        window.addEventListener('orientationchange', renderStatus);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
