export function toggleClasses(className, ...elements) {
    elements.forEach(el => el.classList.toggle(className));
}

export function getElements(...selectors) {
    return selectors.map(selector => document.querySelector(selector));
}

export function initTouchEventHandlers(canvas) {
    const parent = canvas.parentElement;
    let touched = false;
    let initialPosition;
    const overLayElement = document.querySelector('.overlay');
    const boundingBox = parent.getBoundingClientRect(); 

    parent.addEventListener('touchstart', () => {
        console.log('touchstart');
        touched = true;
    });

    parent.addEventListener('touchend', () => {
        console.log('touchend');
        touched = false;
    });

    parent.addEventListener('touchmove', evt => {
        const x = evt.changedTouches[0].clientX;

        if (!initialPosition) {
            initialPosition = x;
            overLayElement.style.transform = `translate(${initialPosition - boundingBox.left}px)`;
            overLayElement.style.display = 'block';
            overLayElement.style.width = 0;
        } else {
            let delta = x - initialPosition;

            requestAnimationFrame(() => {
                overLayElement.style.width = delta + 'px';
            });
        }
    });
}