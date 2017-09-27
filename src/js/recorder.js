export default class Recorder {
    constructor() {
        this.isRunning = false;
    }

    start() {
        this.isRunning = true;
        console.log('recording, yaay!');
    }

    stop() {
        this.isRunning = false;
        console.log('enough of it');
    }
}
