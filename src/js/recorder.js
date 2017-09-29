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
        this.combinedBuffers = buffers;

        this.saveRecording(blob);
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

            const inputNode = this.audioCtx.createMediaStreamSource(stream);
            const analyserNode = this.audioCtx.createAnalyser();
            const compressorNode = this.setupCompressor();

            this.volumeControlNode = this.audioCtx.createGain();
            this.volumeControlNode.gain.value = 0.0;
            const processor = this.audioCtx.createScriptProcessor(0, 2, 2);


            const gainNode = this.audioCtx.createGain();
            gainNode.gain.value = 5.0;

            inputNode.connect(analyserNode);
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

    setBufferPositions(startRatio, endRatio, durationRatio) {
        this.startRatio = startRatio;
        this.endRatio = endRatio;
        this.durationRatio = durationRatio;
    }

    playFromPosition() {
        const source = this.audioCtx.createBufferSource();
        const audioBuffer = this.audioCtx.createBuffer(2, this.combinedBuffers[0].length, 44100);

        const leftChannel = audioBuffer.getChannelData(0);
        const rightChannel = audioBuffer.getChannelData(1);

        leftChannel.set(this.combinedBuffers[0]);
        rightChannel.set(this.combinedBuffers[1]);

        source.buffer = audioBuffer;

        source.connect(this.audioCtx.destination);

        const offset = source.buffer.duration * this.startRatio;
        const duration = this.durationRatio * source.buffer.duration;

        source.start(0, offset, duration);

        this.trim();
    }

    trim() {
        const bufferLength = this.durationRatio * this.combinedBuffers[0].length;

        const audioBuffer = this.audioCtx.createBuffer(2, bufferLength, 44100);

        let leftChannel = audioBuffer.getChannelData(0);
        let rightChannel = audioBuffer.getChannelData(1);

        const trimmedLeftChannel = leftChannel.slice(this.startRatio * bufferLength << 0, this.endRatio * bufferLength << 0);
        const trimmedRightChannel = rightChannel.slice(this.startRatio * bufferLength << 0, this.endRatio * bufferLength << 0);

        leftChannel.set(trimmedLeftChannel);
        rightChannel.set(trimmedRightChannel);

        this.worker.postMessage({ command: 'finish', buffers: [[leftChannel, rightChannel]] });
    }
}
