import { getElements, toggleClasses } from './dom';
import Recorder from './recorder';
import DrawProgress from './draw-progress'

const [button, canvas, controlPanel] = getElements('#record-button', '#canvas', '#control-panel');

const recorder = new Recorder();
const drawProgress = new DrawProgress();

controlPanel.addEventListener('click', () => {
    toggleClasses('recording', button, controlPanel);

    if (!recorder.isRunning) {
        recorder.start();
        // drawProgress.play();
    } else {
        recorder.stop();
        // drawProgress.stop();
    }
});