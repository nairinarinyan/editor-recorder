import { getElements, toggleClasses } from './dom';
import Recorder from './recorder';

const [button, canvas, controlPanel] = getElements('#record-button', '#canvas', '#control-panel');

const recorder = new Recorder();

controlPanel.addEventListener('click', () => {
    toggleClasses('recording', button, controlPanel);

    !recorder.isRunning ?
        recorder.start() :
        recorder.stop();
});