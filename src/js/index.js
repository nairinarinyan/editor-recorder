import { getElements, toggleClasses } from './dom';
import Recorder from './recorder';

const [button, canvas] = getElements('#record-button', '#canvas');

const recorder = new Recorder();

button.addEventListener('click', () => {
    toggleClasses('recording', button, button.firstElementChild);

    !recorder.isRunning ?
        recorder.start() :
        recorder.stop();
});