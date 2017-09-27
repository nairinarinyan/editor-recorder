export function toggleClasses(className, ...elements) {
    elements.forEach(el => el.classList.toggle(className));
}

export function getElements(...selectors) {
    return selectors.map(selector => document.querySelector(selector));
}