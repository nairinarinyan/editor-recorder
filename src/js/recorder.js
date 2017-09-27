import { FrequencyVisualizer, WaveformVisualizer } from './visualizers';

export default class Recorder {
    constructor(canvasCtx) {
        this.canvasCtx = canvasCtx;
        this.bitRate = 64;
        this.isRunning = false;
        this.worker = new Worker('lame/EncoderWorker.js');
        this.worker.onmessage = this.handleWorkerMessages.bind(this);

        this.saveMp3Url = 'http://localhost:3000';

        this.frequencyVisualizer = new FrequencyVisualizer(canvasCtx);
        this.waveformVisualizer = new WaveformVisualizer(canvasCtx);
    }

    saveRecording(blob){
        // send it to server
        let data = new FormData();
        let xhr = new XMLHttpRequest();

        data.append("audio", blob, "record.mp3");

        xhr.open("POST", this.saveMp3Url);
        xhr.onload = () => {
            if (xhr.status == 204) {
                console.log("Uploaded");
            } else {
                console.error(`Error ${xhr.status}. upload failed`);
            }
        };
        xhr.send(data);
    }

    handleWorkerMessages(event) {
        // this.saveRecording(event.data.blob);
        const { buffers, blob } = event.data;
        this.saveRecording(blob);
        this.waveformVisualizer.drawBuffer(buffers[0]);
    }

    getBuffers(event) {
        var buffers = [];
        for (var ch = 0; ch < 2; ++ch)
            buffers[ch] = event.inputBuffer.getChannelData(ch);
        return buffers;
    }

    start() {
        this.audioCtx = new AudioContext();

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
            const processor = this.audioCtx.createScriptProcessor(0, 2, 2);

            inputNode.connect(analyserNode);
            analyserNode.connect(compressorNode);
            compressorNode.connect(processor);
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
