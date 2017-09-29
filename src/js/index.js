import { getElements, toggleClasses, initTouchEventHandlers } from './dom';
import Recorder from './recorder';
import DrawProgress from './draw-progress'

const [recordButton, canvas, controlPanel, playButton, okButton] = getElements('#record-button', '#canvas', '#control-panel', '.play-btn', '.ok-btn');

const canvasCtx = canvas.getContext('2d');

canvas.width = window.innerWidth * .9;

const recorder = new Recorder(canvasCtx);
const drawProgress = new DrawProgress();

canvas.width = window.innerWidth * .9;

recordButton.addEventListener('click', () => {
    toggleClasses('recording', recordButton, controlPanel);

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

playButton.addEventListener('click', evt => {
    evt.stopPropagation();
    recorder.play(); 
});

okButton.addEventListener('click', evt => {
    evt.stopPropagation();
    recorder.saveRecording(); 
});

initTouchEventHandlers(canvas, (startRatio, endRatio, durationRatio) => {
    recorder.setBufferPositions(startRatio, endRatio, durationRatio);
});
