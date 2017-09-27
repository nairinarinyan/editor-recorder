export class FrequencyVisualizer {
    constructor(canvasCtx) {
        this.canvasCtx = canvasCtx;
    }

    startDrawing(analyserNode) {
        analyserNode.fftSize = 64;
        const bufferLength = analyserNode.frequencyBinCount;

        const analysedDataBuffer = new Uint8Array(bufferLength);

        const { width, height } = this.canvasCtx.canvas;
        const { canvasCtx } = this;
        canvasCtx.fillStyle = '#00b2eb';

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

            requestAnimationFrame(draw);
        }

        draw();
    }
}