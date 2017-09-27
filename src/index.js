import { getElements, toggleClasses } from './dom';

const [button, canvas] = getElements('#record-button', '#canvas');

button.addEventListener('click', () => {
    toggleClasses('recording', button, button.firstElementChild);
});