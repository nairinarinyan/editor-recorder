export class FrequencyVisualizer {
    constructor(canvasCtx) {
        this.canvasCtx = canvasCtx;
    }

    startDrawing(analyserNode) {
        analyserNode.fftSize = 256;
        const bufferLength = analyserNode.frequencyBinCount;

        this.analysedDataBuffer = new Uint8Array(bufferLength);
        analyserNode.getByteFrequencyData(this.analysedDataBuffer);

        this.draw();
    }

    draw(time) {
        requestAnimationFrame(this.draw.bind(this));
    }
}