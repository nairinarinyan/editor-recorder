import { getElements, toggleClasses } from './dom';
import Recorder from './recorder';

const [button, canvas, controlPanel] = getElements('#record-button', '#canvas', '#control-panel');

const canvasCtx = canvas.getContext('2d');
canvas.width = canvas.width * devicePixelRatio;
canvas.height = canvas.height * devicePixelRatio;
const recorder = new Recorder(canvasCtx);

controlPanel.addEventListener('click', () => {
    toggleClasses('recording', button, controlPanel);

    !recorder.isRunning ?
        recorder.start() :
        recorder.stop();
});