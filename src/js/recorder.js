import { FrequencyVisualizer } from './visualizers';

export default class Recorder {
    constructor(canvasCtx) {
        this.canvasCtx = canvasCtx;
        this.bitRate = 64;
        this.isRunning = false;
        this.worker = new Worker('lame/EncoderWorker.js');
        this.worker.onmessage = (event) => { this.saveRecording(event.data.blob); };

        this.frequencyVisualizer = new FrequencyVisualizer(canvasCtx);
    }

    initializeBuffer(audioContext){
        // processor buffer size

        let defaultBufSz = (function() {
            let processor = audioContext.createScriptProcessor(undefined, 2, 2);
            return processor.bufferSize;
        })();

        this.bufferSize = defaultBufSz;
    }

    saveRecording(blob){
        let blobUrl = URL.createObjectURL(blob);
        console.log('Got a recoding at', blobUrl);
        let a = document.createElement("a");
        document.body.appendChild(a);
        a.style = "display: none";
        a.href = blobUrl;
        a.download = 'recording.mp3';
        a.click();
        URL.revokeObjectURL(blobUrl);

    }

    getBuffers(event) {
        var buffers = [];
        for (var ch = 0; ch < 2; ++ch)
            buffers[ch] = event.inputBuffer.getChannelData(ch);
        return buffers;
    }

    start() {
        this.audioCtx = new AudioContext();
        this.initializeBuffer(this.audioCtx);

        navigator.mediaDevices.getUserMedia({
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
            const processor = this.audioCtx.createScriptProcessor(this.bufferSize, 2, 2);

            inputNode.connect(compressorNode);
            compressorNode.connect(analyserNode);
            analyserNode.connect(processor);
            processor.connect(muteNode);
            
            muteNode.connect(this.audioCtx.destination);

            this.worker.postMessage({
                command: 'start',
                process: 'separate',
                sampleRate: this.audioCtx.sampleRate,
                bitRate: this.bitRate
            });

            processor.onaudioprocess = (event) => {
                this.worker.postMessage({ command: 'record', buffers: this.getBuffers(event) });
            };

            this.frequencyVisualizer.startDrawing(analyserNode);
        })
        .catch(console.error);
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

    stop() {
        this.worker.postMessage({ command:'finish' });
        this.audioStream && this.audioStream.getAudioTracks()[0].stop();
        this.isRunning = false;
    }
}
