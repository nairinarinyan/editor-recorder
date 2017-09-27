export class FrequencyVisualizer {
    constructor(canvasCtx) {
        this.canvasCtx = canvasCtx;
    }

    startDrawing(analyserNode) {
        analyserNode.fftSize = 256;
        const bufferLength = analyserNode.frequencyBinCount;

        const analysedDataBuffer = new Uint8Array(bufferLength);

        const { width, height } = this.canvasCtx.canvas;
        const { canvasCtx } = this;
        canvasCtx.fillStyle = '#00b2eb';

        function draw() {
            requestAnimationFrame(draw);
            analyserNode.getByteFrequencyData(analysedDataBuffer);
            canvasCtx.clearRect(0, 0, width, height);

            var barWidth = (width / bufferLength) * 2.5;
            var barHeight;
            var x = 0; 

            for(var i = 0; i < bufferLength; i++) {
                barHeight = analysedDataBuffer[i]/2;

                canvasCtx.fillRect(x,height-barHeight/2,barWidth,barHeight);

                x += barWidth + 1;
            }
        }

        draw();
    }
}