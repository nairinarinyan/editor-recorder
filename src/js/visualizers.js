let rafId;
const blue = '#00b2eb';

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

export class WaveformVisualizer {
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