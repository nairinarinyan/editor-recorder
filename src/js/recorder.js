import { FrequencyVisualizer } from './visualizers';

export default class Recorder {
    constructor(canvasCtx) {
        this.canvasCtx = canvasCtx;
        this.isRunning = false;
        this.worker = new Worker('lame/EncoderWorker.js');

        this.frequencyVisualizer = new FrequencyVisualizer(canvasCtx);
    }

    start() {
        this.audioCtx = new AudioContext();

        return navigator.mediaDevices.getUserMedia({
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
                sampleSize: 16,
                sampleRate: 16000
            }
        })
        .then(stream => {
            this.audioStream = stream;
            this.isRunning = true;

            const inputNode = this.audioCtx.createMediaStreamSource(stream);
            const analyserNode = this.audioCtx.createAnalyser();
            const compressorNode = this.setupCompressor();

            const muteNode = this.audioCtx.createGain();
            muteNode.gain.value = 0.0;

            inputNode.connect(compressorNode);
            compressorNode.connect(analyserNode);
            analyserNode.connect(muteNode);
            muteNode.connect(this.audioCtx.destination);

            this.frequencyVisualizer.startDrawing(analyserNode);
        })
        .catch(console.error);
    }

    stop() {
        this.audioStream && this.audioStream.getAudioTracks()[0].stop();
        this.isRunning = false;
    }

    setupCompressor() {
        const compressorNode = this.audioCtx.createDynamicsCompressor();
        compressorNode.threshold.value = -50;
        compressorNode.knee.value = 40;
        compressorNode.ratio.value = 12;
        compressorNode.attack.value = 0;
        compressorNode.release.value = 0.25;

        return compressorNode;
    }
}
