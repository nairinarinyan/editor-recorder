const notificationNode = document.querySelector('.notification');

export function toggleClasses(className, ...elements) {
    elements.forEach(el => el.classList.toggle(className));
}

export function getElements(...selectors) {
    return selectors.map(selector => document.querySelector(selector));
}

export function showNotification(message, error) {
    notificationNode.firstElementChild.innerText = message;

    if (error) {
        notificationNode.classList.add('error');
    }

    notificationNode.classList.add('active');
    setTimeout(() => {
        notificationNode.classList.remove('active');
        notificationNode.classList.remove('error');
    }, 2000);
}

export function initTouchEventHandlers(canvas, callBack) {
    const parent = canvas.parentElement;
    let initialPosition;
    let delta;
    const selectionOverlayElement = document.querySelector('.sound-selection-overlay');
    const startOverlayElement = document.querySelector('.sound-start-overlay');
    const endOverlayElement = document.querySelector('.sound-end-overlay');
    const boundingBox = parent.getBoundingClientRect(); 

    let x;

    parent.addEventListener('touchstart', evt => {
        x = evt.changedTouches[0].clientX;
        initialPosition = x;
        selectionOverlayElement.style.transform = startOverlayElement.style.transform = `translate(${initialPosition - boundingBox.left}px)`;
        selectionOverlayElement.style.display = 'block';
        selectionOverlayElement.style.width = 0;
        startOverlayElement.style.height = endOverlayElement.style.height = boundingBox.height;
    });

    parent.addEventListener('touchend', evt => {
        const startPosition =  (initialPosition - boundingBox.left) / boundingBox.width;
        const endPosition =  (x - boundingBox.left) / boundingBox.width;
        const duration = delta / boundingBox.width;
        callBack(startPosition, endPosition, duration);
    });

    parent.addEventListener('touchmove', evt => {
        x = evt.changedTouches[0].clientX;

        if (x > boundingBox.left + boundingBox.width) {
            x = boundingBox.width + boundingBox.left;
        }

        delta = x - initialPosition;

        requestAnimationFrame(() => {
            selectionOverlayElement.style.width = delta + 'px';
            startOverlayElement.style.display = endOverlayElement.style.display = 'block';
            endOverlayElement.style.transform = `translate(${initialPosition - boundingBox.left + delta - 4}px)`;
        });
    });
}
