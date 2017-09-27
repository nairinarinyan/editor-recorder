import { getElements, toggleClasses } from './dom';
import Recorder from './recorder';

const [button, canvas] = getElements('#record-button', '#canvas');

const canvasCtx = canvas.getContext('2d');
const recorder = new Recorder(canvasCtx);

button.addEventListener('click', () => {
    toggleClasses('recording', button, button.firstElementChild);

    !recorder.isRunning ?
        recorder.start() :
        recorder.stop();
});