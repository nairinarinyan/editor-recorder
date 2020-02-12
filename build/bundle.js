(function () {
'use strict';

const notificationNode = document.querySelector('.notification');

function toggleClasses(className, ...elements) {
    elements.forEach(el => el.classList.toggle(className));
}

function getElements(...selectors) {
    return selectors.map(selector => document.querySelector(selector));
}

function showNotification(message, error) {
    notificationNode.firstElementChild.innerText = message;

    if (error) {
        notificationNode.classList.add('error');
    }

    notificationNode.classList.add('active');
    setTimeout(() => {
        notificationNode.classList.remove('active');
        notificationNode.classList.remove('error');
    }, 2000);
}

function initTouchEventHandlers(canvas, cb) {
    const parent = canvas.parentElement;
    let initialPosition;
    let delta;
    const overLayElement = document.querySelector('.overlay');
    const boundingBox = parent.getBoundingClientRect(); 

    let x;

    parent.addEventListener('touchstart', evt => {
        x = evt.changedTouches[0].clientX;

        initialPosition = x;
        overLayElement.style.transform = `translate(${initialPosition - boundingBox.left}px)`;
        overLayElement.style.display = 'block';
        overLayElement.style.width = 0;
    });

    parent.addEventListener('touchend', evt => {
        const startRatio =  (initialPosition - boundingBox.left) / boundingBox.width;
        const endRatio =  (x - boundingBox.left) / boundingBox.width;
        const durationRatio = delta / boundingBox.width;

        cb(startRatio, endRatio, durationRatio);
    });

    parent.addEventListener('touchmove', evt => {
        x = evt.changedTouches[0].clientX;

        if (x > boundingBox.left + boundingBox.width) {
            x = boundingBox.width + boundingBox.left;
        }

        delta = x - initialPosition;

        requestAnimationFrame(() => {
            overLayElement.style.width = delta + 'px';
        });
    });
}

let rafId;
const blue = '#00b2eb';

class FrequencyVisualizer {
    constructor(canvasCtx) {
        this.canvasCtx = canvasCtx;
    }

    startDrawing(analyserNode) {
        analyserNode.fftSize = 64;
        const bufferLength = analyserNode.frequencyBinCount;

        const analysedDataBuffer = new Uint8Array(bufferLength);

        const { width, height } = this.canvasCtx.canvas;
        const { canvasCtx } = this;
        canvasCtx.fillStyle = blue;

        function draw() {
            analyserNode.getByteFrequencyData(analysedDataBuffer);
            canvasCtx.clearRect(0, 0, width, height);

            var barWidth = (width / bufferLength) * 2;
            var barHeight;
            var x = 0; 

            for(var i = 0; i < bufferLength; i++) {
                barHeight = analysedDataBuffer[i];

                canvasCtx.fillRect(x,height-barHeight/2,barWidth,barHeight);

                x += barWidth + 5;
            }

            rafId = requestAnimationFrame(draw);
        }

        draw();
    }
}

class WaveformVisualizer {
    constructor(canvasCtx) {
        this.canvasCtx = canvasCtx;
    }

    drawBuffer(data) {
        const { width, height } = this.canvasCtx.canvas;

        cancelAnimationFrame(rafId);

        var step = Math.ceil( data.length / width );
        var amp = height / 2;

        this.canvasCtx.fillStyle = blue;
        this.canvasCtx.clearRect(0,0,width,height);

        for(var i=0; i < width; i++){
            var min = 1.0;
            var max = -1.0;

            for (var j=0; j<step; j++) {
                var datum = data[(i*step)+j]; 
                if (datum < min)
                    min = datum;
                if (datum > max)
                    max = datum;
            }

            this.canvasCtx.fillRect(i,(1+min)*amp,1,Math.max(1,(max-min)*amp));
        }
    }

}

class Recorder {
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

const [timerBar] = getElements('#timer-bar');

class DrawProgress {
    constructor() {
        this.progress = 100;
        this.isRunning = false;
        this.circle = timerBar;
        this.radius = parseInt(timerBar.getAttribute('r'), 10);
        this.c = 2 * Math.PI * this.radius;
        this.circleDashoffset = window.getComputedStyle(this.circle);
    }

    getPercentage(value) {
        return (( 100 - value ) / 100) * this.c;
    }

    play() {
        this.isRunning = true;
        this.timer = setInterval(() => {
            if (this.circleDashoffset.getPropertyValue('stroke-dashoffset') === '-360px') {
                this.stop();
            }
        }, 1000);
      
    }

    stop() {
        this.isRunning = false;
        clearInterval(this.timer);
        this.timer = null;
    }
   
    setProgress(value) {
        // this.progress = value;
        // console.log('-----', this.getPercentage(value));
        // this.circle.style.strokeDashoffset = this.getPercentage(value);
        
        this.circle.style.strokeDashoffset = this.getPercentage(value);
    }

}

const [recordButton, canvas, controlPanel, playButton, okButton] = getElements('#record-button', '#canvas', '#control-panel', '.play-btn', '.ok-btn');

const canvasCtx = canvas.getContext('2d');

canvas.width = window.innerWidth * window.devicePixelRatio * .9;
canvas.height = window.devicePixelRatio * 200;

const recorder = new Recorder(canvasCtx);
const drawProgress = new DrawProgress();

recordButton.addEventListener('click', () => {
    toggleClasses('recording', recordButton, controlPanel);

    if (!recorder.isRunning) {
        recorder.start();
        drawProgress.play();
        if ( controlPanel.classList.contains('record-finished') ) {
            controlPanel.classList.remove('record-finished');
        }
    } else {
        recorder.stop();
        drawProgress.stop();
        controlPanel.classList.add('record-finished');
    }
});

playButton.addEventListener('click', evt => {
    evt.stopPropagation();
    recorder.play(); 
});

okButton.addEventListener('click', evt => {
    evt.stopPropagation();
    recorder.saveRecording(); 
});

initTouchEventHandlers(canvas, (startRatio, endRatio, durationRatio) => {
    recorder.setBufferPositions(startRatio, endRatio, durationRatio);
});

}());
