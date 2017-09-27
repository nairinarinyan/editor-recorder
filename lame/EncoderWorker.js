importScripts('Mp3LameEncoder.min.js');

var buffers = undefined,
    encoder = undefined,
      recBuffersL = [],
      recBuffersR = [],
    recLength = 0;

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
            // if (buffers != null)
            //     while (buffers.length > 0)
            //         encoder.encode(buffers.shift());

            // self.postMessage({ blob: encoder.finish() });

            // encoder = undefined;

            self.postMessage({ buffers: getBuffers() });

            break;
        case 'cancel':
            encoder.cancel();
            encoder = undefined;
    }
};