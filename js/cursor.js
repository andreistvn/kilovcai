(function () {
    const sparkles = 40;
    const colours = ["#000", "#000"];

    let cNum = 0;
    let x = 300;
    let y = 100;
    let ox = 300;
    let oy = 100;
    let swide = window.innerWidth;
    let shigh = window.innerHeight;
    let sleft = 0;
    let sdown = 0;

    const tiny = [];
    const star = [];
    const starv = [];
    const starx = [];
    const stary = [];
    const tinyx = [];
    const tinyy = [];
    const tinyv = [];

    let animationTimer = null;
    let sparkleContainer = null;
    let isInteractingWithControls = false;
    let isPaused = false;

    function createDiv(height, width) {
        const div = document.createElement("div");
        div.style.position = "absolute";
        div.style.height = height + "px";
        div.style.width = width + "px";
        div.style.overflow = "hidden";
        div.style.pointerEvents = "none";
        div.style.zIndex = "15000";
        return div;
    }

    function buildSparkles() {
        if (sparkleContainer) return;

        sparkleContainer = document.createElement("div");
        sparkleContainer.id = "sparkle-container";
        sparkleContainer.style.position = "fixed";
        sparkleContainer.style.top = "0";
        sparkleContainer.style.left = "0";
        sparkleContainer.style.width = "100%";
        sparkleContainer.style.height = "100%";
        sparkleContainer.style.pointerEvents = "none";
        sparkleContainer.style.zIndex = "15000";
        document.body.appendChild(sparkleContainer);

        for (let i = 0; i < sparkles; i++) {
            const tinySparkle = createDiv(3, 3);
            tinySparkle.style.visibility = "hidden";
            sparkleContainer.appendChild((tiny[i] = tinySparkle));
            starv[i] = 0;
            tinyv[i] = 0;

            const starSparkle = createDiv(5, 5);
            starSparkle.style.backgroundColor = "transparent";
            starSparkle.style.visibility = "hidden";

            const leftArm = createDiv(1, 5);
            const downArm = createDiv(5, 1);
            starSparkle.appendChild(leftArm);
            starSparkle.appendChild(downArm);
            leftArm.style.top = "2px";
            leftArm.style.left = "0";
            downArm.style.top = "0";
            downArm.style.left = "2px";
            sparkleContainer.appendChild((star[i] = starSparkle));
        }
    }

    function startAnimation() {
        if (animationTimer) return;
        animationTimer = window.setInterval(sparkle, 50);
    }

    function stopAnimation() {
        if (!animationTimer) return;
        window.clearInterval(animationTimer);
        animationTimer = null;
    }

    function hideAllEffects() {
        for (let i = 0; i < sparkles; i++) {
            if (star[i]) star[i].style.visibility = "hidden";
            if (tiny[i]) tiny[i].style.visibility = "hidden";
        }
    }

    function isControlElement(element) {
        return !!element && (
            element.tagName === "BUTTON" ||
            element.tagName === "A" ||
            element.tagName === "INPUT" ||
            element.tagName === "SELECT" ||
            element.tagName === "TEXTAREA" ||
            element.closest(".exhibit-close") !== null ||
            element.closest("#wake-toggle") !== null
        );
    }

    function setupInteractionGuards() {
        document.addEventListener("mousedown", (event) => {
            if (isControlElement(event.target)) {
                isInteractingWithControls = true;
                isPaused = true;
                stopAnimation();
                hideAllEffects();
            }
        });

        document.addEventListener("mouseup", () => {
            if (isInteractingWithControls) {
                isInteractingWithControls = false;
                isPaused = false;
                startAnimation();
            }
        });

        document.addEventListener("mousemove", handlePointerMove, { passive: true });
        document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    function handlePointerMove(event) {
        if (isPaused) return;
        if (isControlElement(event.target)) {
            isInteractingWithControls = true;
            return;
        }

        isInteractingWithControls = false;
        y = event.pageY;
        x = event.pageX;
        sdown = window.pageYOffset;
        sleft = window.pageXOffset;
    }

    function handleVisibilityChange() {
        if (document.hidden) {
            stopAnimation();
            hideAllEffects();
            return;
        }

        if (!isPaused && !isInteractingWithControls) {
            startAnimation();
        }
    }

    function sparkle() {
        if (isPaused) return;

        let c;
        if (!isInteractingWithControls && (x !== ox || y !== oy)) {
            ox = x;
            oy = y;

            for (c = 0; c < sparkles; c++) {
                if (!starv[c]) {
                    star[c].style.left = (starx[c] = x) + "px";
                    star[c].style.top = (stary[c] = y) + "px";
                    star[c].style.clip = "rect(0px, 5px, 5px, 0px)";
                    star[c].childNodes[0].style.backgroundColor = star[c].childNodes[1].style.backgroundColor = colours[cNum % colours.length];
                    cNum++;
                    star[c].style.visibility = "visible";
                    starv[c] = 50;
                    break;
                }
            }
        }

        for (c = 0; c < sparkles; c++) {
            if (starv[c]) updateStar(c);
            if (tinyv[c]) updateTiny(c);
        }
    }

    function updateStar(index) {
        if (--starv[index] === 25) {
            star[index].style.clip = "rect(1px, 4px, 4px, 1px)";
        }

        if (starv[index]) {
            stary[index] += 1 + Math.random() * 3;
            if (stary[index] < shigh + sdown) {
                star[index].style.top = stary[index] + "px";
                starx[index] += ((index % 5) - 2) / 5;
                star[index].style.left = starx[index] + "px";
            } else {
                star[index].style.visibility = "hidden";
                starv[index] = 0;
            }
            return;
        }

        tinyv[index] = 50;
        tiny[index].style.top = (tinyy[index] = stary[index]) + "px";
        tiny[index].style.left = (tinyx[index] = starx[index]) + "px";
        tiny[index].style.width = "2px";
        tiny[index].style.height = "2px";
        tiny[index].style.backgroundColor = star[index].childNodes[0].style.backgroundColor;
        star[index].style.visibility = "hidden";
        tiny[index].style.visibility = "visible";
    }

    function updateTiny(index) {
        if (--tinyv[index] === 25) {
            tiny[index].style.width = "1px";
            tiny[index].style.height = "1px";
        }

        if (tinyv[index]) {
            tinyy[index] += 1 + Math.random() * 3;
            if (tinyy[index] < shigh + sdown) {
                tiny[index].style.top = tinyy[index] + "px";
                tinyx[index] += ((index % 5) - 2) / 5;
                tiny[index].style.left = tinyx[index] + "px";
            } else {
                tiny[index].style.visibility = "hidden";
                tinyv[index] = 0;
            }
            return;
        }

        tiny[index].style.visibility = "hidden";
    }

    document.addEventListener("DOMContentLoaded", () => {
        buildSparkles();
        setupInteractionGuards();
        startAnimation();
    });

    window.addEventListener("resize", () => {
        swide = window.innerWidth;
        shigh = window.innerHeight;
    });
})();