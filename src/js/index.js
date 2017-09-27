import { getElements, toggleClasses, initTouchEventHandlers } from './dom';
import Recorder from './recorder';

const [button, canvas, controlPanel] = getElements('#record-button', '#canvas', '.control-panel.record');

const canvasCtx = canvas.getContext('2d');

canvas.width = window.innerWidth * .9;

const recorder = new Recorder(canvasCtx);

controlPanel.addEventListener('click', () => {
    toggleClasses('recording', button, controlPanel);

    !recorder.isRunning ?
        recorder.start() :
        recorder.stop();
});

initTouchEventHandlers(canvas, (startRatio, endRatio) => {
      
});