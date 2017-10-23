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

    setBufferPositions(startRatio, endRatio, durationRatio) {
        this.startRatio = startRatio;
        this.endRatio = endRatio;
        this.durationRatio = durationRatio;
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

        let offset = source.buffer.duration * this.startRatio;
        let duration = this.durationRatio * source.buffer.duration;

        if (isNaN(offset)) {
            offset = 0;
        }

        if (isNaN(duration)) {
            duration = source.buffer.duration;
        }

        source.start(0, offset, duration);
    }

    trim() {
        const bufferLength = Math.round(this.durationRatio * this.combinedBuffers[0].length);
        const originalBufferLength = this.combinedBuffers[0].length;

        const tmpBuffer = this.audioCtx.createBuffer(2, originalBufferLength, 44100);
        let tmpLeftChannel = tmpBuffer.getChannelData(0);
        let tmpRightChannel = tmpBuffer.getChannelData(1);

        tmpLeftChannel.set(this.combinedBuffers[0]);
        tmpRightChannel.set(this.combinedBuffers[1]);

        const audioBuffer = this.audioCtx.createBuffer(2, bufferLength, 44100);

        let leftChannel = audioBuffer.getChannelData(0);
        let rightChannel = audioBuffer.getChannelData(1);

        const trimmedLeftChannel = tmpLeftChannel.slice(this.startRatio * originalBufferLength << 0, this.endRatio * originalBufferLength << 0);
        const trimmedRightChannel = tmpRightChannel.slice(this.startRatio * originalBufferLength << 0, this.endRatio * originalBufferLength << 0);

        leftChannel.set(trimmedLeftChannel);
        rightChannel.set(trimmedRightChannel);

        this.worker.postMessage({ command: 'finish', buffers: [[leftChannel, rightChannel]] });
    }
}
