import { getElements, toggleClasses, initTouchEventHandlers } from './dom';
import Recorder from './recorder';
import DrawProgress from './draw-progress'

const [button, canvas, controlPanel] = getElements('#record-button', '#canvas', '#control-panel');

const canvasCtx = canvas.getContext('2d');

canvas.width = window.innerWidth * .9;

const recorder = new Recorder(canvasCtx);
const drawProgress = new DrawProgress();

canvas.width = window.innerWidth * .9;

controlPanel.addEventListener('click', () => {
    toggleClasses('recording', button, controlPanel);

    if (!recorder.isRunning) {
        recorder.start();
        drawProgress.play();
        if ( controlPanel.classList.contains('record-finished') ) {
            controlPanel.classList.remove('record-finished');
        }
    } else {
        recorder.stop();
        drawProgress.stop();
        controlPanel.classList.add('record-finished');
    }
});

initTouchEventHandlers(canvas, (startRatio, endRatio, durationRatio) => {
    recorder.setBufferPositions(startRatio, endRatio, durationRatio);
    recorder.playFromPosition();
});
