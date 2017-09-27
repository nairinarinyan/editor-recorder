importScripts('Mp3LameEncoder.min.js');

var buffers = undefined,
    encoder = undefined,
      recBuffersL = [],
      recBuffersR = [],
    recLength = 0;

var sampleRate, bitRate;

function mergeBuffers(recBuffers, recLength){
    var result = new Float32Array(recLength);
    var offset = 0;

    for (var i = 0; i < recBuffers.length; i++){
        result.set(recBuffers[i], offset);
        offset += recBuffers[i].length;
    }

    return result;
}

function getBuffers() {
    var retBuffers = [];

    retBuffers.push(mergeBuffers(recBuffersL, recLength) );
    retBuffers.push(mergeBuffers(recBuffersR, recLength) );

    return retBuffers;
}

self.onmessage = function(event) {
    var data = event.data;

    switch (data.command) {
        case 'start':
            sampleRate = data.sampleRate;
            bitRate = data.bitRate;

            encoder = new Mp3LameEncoder(data.sampleRate, data.bitRate);
            buffers = data.process === 'separate' ? [] : undefined;
            break;
        case 'record':
            if (buffers !== null) {


                buffers.push(data.buffers);

                recBuffersL.push(data.buffers[0]);
                recBuffersR.push(data.buffers[1]);

                recLength += data.buffers[0].length;
            } else {
                encoder.encode(data.buffers);
            }
            break;
        case 'finish':
            let buf = getBuffers();

            if (data.buffers) {
                encoder = new Mp3LameEncoder(sampleRate, bitRate);
            }

            let bufferz = data.buffers || buffers;

            if (bufferz != null) {
                while (bufferz.length > 0) {
                    encoder.encode(bufferz.shift());
                }
            }
            self.postMessage({ buffers: buf, blob: encoder.finish() });
            break;
        case 'cancel':
            encoder.cancel();
            encoder = undefined;
    }
};