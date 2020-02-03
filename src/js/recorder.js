import { FrequencyVisualizer, WaveformVisualizer } from './visualizers';
import { showNotification } from './dom';

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
        this.buffers = [];
    }

    saveBlob(blob) {
        this.currentBlob = blob; 
    }

    saveRecording(){
        // send it to server
        let data = new FormData();
        let xhr = new XMLHttpRequest();

        data.append("audio", this.currentBlob, "record.mp3");

        xhr.open("POST", this.saveMp3Url);
        xhr.onload = () => {
            if (xhr.status == 204) {
                showNotification('Uploaded', true);
            } else {
                showNotification('Error');
            }
        };

        xhr.send(data);
    }

    handleWorkerMessages(event) {
        // this.saveRecording(event.data.blob);
        const { buffers, blob } = event.data;
        this.combinedBuffers = buffers;

        this.saveBlob(blob);
        this.waveformVisualizer.drawBuffer(buffers[0]);
    }

    getBuffers(event) {
        this.buffers = [];

        for (var ch = 0; ch < 2; ++ch) {
            this.buffers[ch] = event.inputBuffer.getChannelData(ch);
        }

        return this.buffers;
    }

    cleanup() {
        this.isRunning = false;
        this.worker.postMessage({ command:'cancel' });
        if (this.audioCtx) {
            this.audioCtx.close();
        }
        if (this.inputNode) {
            this.inputNode.disconnect();
        }
        if (this.volumeControlNode) {
            this.volumeControlNode.disconnect();
        }
    }

    start() {
        this.cleanup();
        this.audioCtx = new AudioContext();

        navigator.mediaDevices.getUserMedia({
            video: false,
            audio: {
                echoCancellation: true, // disabling audio processing
                googAutoGainControl: true,
                autoGainControl: true,
                googNoiseSuppression: true,
                noiseSuppression: true,
                channelCount:2,
                googHighpassFilter: true,
                googTypingNoiseDetection: true,
                sampleSize: 16,
                sampleRate: 44100
            }
        })
        .then(stream => {
            this.audioStream = stream;
            this.isRunning = true;

            this.inputNode = this.audioCtx.createMediaStreamSource(stream);
            const analyserNode = this.audioCtx.createAnalyser();
            const compressorNode = this.setupCompressor();

            this.volumeControlNode = this.audioCtx.createGain();
            this.volumeControlNode.gain.value = 0.0;
            const processor = this.audioCtx.createScriptProcessor(0, 2, 2);


            const gainNode = this.audioCtx.createGain();
            gainNode.gain.value = 3.0;

            this.inputNode.connect(analyserNode);
            analyserNode.connect(compressorNode);
            compressorNode.connect(gainNode);
            gainNode.connect(processor);
            processor.connect(this.volumeControlNode);
            
            this.volumeControlNode.connect(this.audioCtx.destination);

            this.worker.postMessage({
                command: 'start',
                process: 'separate',
                sampleRate: this.audioCtx.sampleRate,
                bitRate: this.bitRate
            });

            processor.onaudioprocess = (event) => {
                this.isRunning &&
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
        this.audioCtx.suspend();
        this.isRunning = false;
    }

    setBufferPositions(startPosition, endPosition, duration) {
        this.startPosition = startPosition;
        this.endPosition = endPosition;
        this.duration = duration;
        this.trim();
    }

    play() {
        this.audioCtx.resume();

        const source = this.audioCtx.createBufferSource();
        const audioBuffer = this.audioCtx.createBuffer(2, this.combinedBuffers[0].length, 44100);

        const leftChannel = audioBuffer.getChannelData(0);
        const rightChannel = audioBuffer.getChannelData(1);

        leftChannel.set(this.combinedBuffers[0]);
        rightChannel.set(this.combinedBuffers[1]);

        source.buffer = audioBuffer;

        source.connect(this.audioCtx.destination);

        let offset = source.buffer.duration * this.startPosition;
        let duration = this.duration * source.buffer.duration;

        if (isNaN(offset)) {
            offset = 0;
        }

        if (isNaN(duration)) {
            duration = source.buffer.duration;
        }

        console.log('duration now', duration);

        source.start(0, offset, duration);
    }

    trim() {
        const bufferLength = Math.round(this.duration * this.combinedBuffers[0].length);
        const originalBufferLength = this.combinedBuffers[0].length;

        const tmpBuffer = this.audioCtx.createBuffer(2, originalBufferLength, 44100);
        let tmpLeftChannel = tmpBuffer.getChannelData(0);
        let tmpRightChannel = tmpBuffer.getChannelData(1);

        tmpLeftChannel.set(this.combinedBuffers[0]);
        tmpRightChannel.set(this.combinedBuffers[1]);

        const audioBuffer = this.audioCtx.createBuffer(2, bufferLength, 44100);

        let leftChannel = audioBuffer.getChannelData(0);
        let rightChannel = audioBuffer.getChannelData(1);

        const trimmedLeftChannel = tmpLeftChannel.slice(this.startPosition * originalBufferLength << 0, this.endPosition * originalBufferLength << 0);
        const trimmedRightChannel = tmpRightChannel.slice(this.startPosition * originalBufferLength << 0, this.endPosition * originalBufferLength << 0);

        leftChannel.set(trimmedLeftChannel);
        rightChannel.set(trimmedRightChannel);

        this.worker.postMessage({ command: 'finish', buffers: [[leftChannel, rightChannel]] });
    }
}
