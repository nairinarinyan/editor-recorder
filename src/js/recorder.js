export default class Recorder {
    constructor() {
        this.isRunning = false;
    }

    start() {
        this.audioCtx = new AudioContext();

        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(stream => {
                this.audioStream = stream;
                this.isRunning = true;

                const input = this.audioCtx.createMediaStreamSource(stream);
                input.connect(this.audioCtx.destination);
            })
            .catch(console.error);
    }

    stop() {
        this.audioStream && this.audioStream.getAudioTracks()[0].stop();
        this.isRunning = false;
    }
}
