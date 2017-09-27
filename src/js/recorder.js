export default class Recorder {

    constructor() {
        this.bitRate = 64;
        this.isRunning = false;
        this.worker = new Worker('lame/EncoderWorker.js');
        this.worker.onmessage = (event) => { this.saveRecording(event.data.blob); };
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
                const analyser = this.audioCtx.createAnalyser();
                const muteNode = this.audioCtx.createGain();
                muteNode.gain.value = 0.0;
                var compressor = this.setupCompressor();

                input.connect(compressor);
                compressor.connect(analyser);
                analyser.connect(muteNode);
                muteNode.connect(this.audioCtx.destination);

                let processor = this.audioCtx.createScriptProcessor(this.bufferSize, 2, 2);
                input.connect(processor);
                processor.connect(this.audioCtx.destination);

                this.worker.postMessage({
                    command: 'start',
                    process: 'separate',
                    sampleRate: this.audioCtx.sampleRate,
                    bitRate: this.bitRate
                });
                processor.onaudioprocess = (event) => {
                    this.worker.postMessage({ command: 'record', buffers: this.getBuffers(event) });
                };



            }).catch(console.error);
    }

    setupCompressor() {
        const compressor = this.audioCtx.createDynamicsCompressor();
        compressor.threshold.value = -50;
        compressor.knee.value = 40;
        compressor.ratio.value = 12;
        compressor.attack.value = 0;
        compressor.release.value = 0.25;

        return compressor;
    }

    stop() {
        this.worker.postMessage({ command:'finish' });
        this.audioStream && this.audioStream.getAudioTracks()[0].stop();
        this.isRunning = false;
    }
}
