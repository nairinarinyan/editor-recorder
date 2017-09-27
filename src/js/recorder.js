export default class Recorder {

    constructor() {
        this.isRunning = false;
        this.worker = new Worker('lame/EncoderWorker.js');
    }

    start() {
        this.audioCtx = new AudioContext();
        navigator.mediaDevices.getUserMedia(
            {
                video: false,
                audio: {
                    echoCancellation: true, // disabling audio processing
                    googAutoGainControl: true,
                    autoGainControl: true,
                    googNoiseSuppression: true,
                    noiseSuppression: true,
                    channelCount:1,
                    googHighpassFilter: true,
                    googTypingNoiseDetection: true,
                    echoCancellation: true,
                    sampleSize: 16,
                    sampleRate: 16000
                }
            }
        )
            .then(stream => {
            this.audioStream = stream;
        this.isRunning = true;

        const input = this.audioCtx.createMediaStreamSource(stream);

        var compressor = this.audioCtx.createDynamicsCompressor();
        compressor.threshold.value = -50;
        compressor.knee.value = 40;
        compressor.ratio.value = 12;
        compressor.attack.value = 0;
        compressor.release.value = 0.25;

        input.connect(compressor);
        compressor.connect(this.audioCtx.destination);

    }).catch(console.error);
    }

    stop() {
        this.audioStream && this.audioStream.getAudioTracks()[0].stop();
        this.isRunning = false;
    }
}
