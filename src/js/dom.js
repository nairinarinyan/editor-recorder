export function toggleClasses(className, ...elements) {
    elements.forEach(el => el.classList.toggle(className));
}

export function getElements(...selectors) {
    return selectors.map(selector => document.querySelector(selector));
}

export function initTouchEventHandlers(canvas, cb) {
    const parent = canvas.parentElement;
    let touched = false;
    let initialPosition;
    let delta;
    const overLayElement = document.querySelector('.overlay');
    const boundingBox = parent.getBoundingClientRect(); 

    let x;

    parent.addEventListener('touchstart', () => {
        // console.log('touchstart');
        touched = true;
    });

    parent.addEventListener('touchend', evt => {
        const startRatio =  (initialPosition - boundingBox.left) / boundingBox.width;

        const endRatio =  (x - boundingBox.left) / boundingBox.width;

        const durationRatio = delta / boundingBox.width;

        cb(startRatio, endRatio, durationRatio);

        touched = false;
    });

    parent.addEventListener('touchmove', evt => {
        x = evt.changedTouches[0].clientX;

        if (!initialPosition) {
            initialPosition = x;
            overLayElement.style.transform = `translate(${initialPosition - boundingBox.left}px)`;
            overLayElement.style.display = 'block';
            overLayElement.style.width = 0;
        } else {
            if (x > boundingBox.left + boundingBox.width) {
                x = boundingBox.width + boundingBox.left;
            }

            delta = x - initialPosition;

            requestAnimationFrame(() => {
                overLayElement.style.width = delta + 'px';
            });
        }
    });
}