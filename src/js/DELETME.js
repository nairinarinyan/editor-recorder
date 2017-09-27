
// audio context + .createScriptProcessor shim
var audioContext = new AudioContext;
if (audioContext.createScriptProcessor == null)
    audioContext.createScriptProcessor = audioContext.createJavaScriptNode;

// obtaining microphone input
$microphone.click(function() {
    if (microphone == null)
        navigator.getUserMedia({ audio: true },
            function(stream) {
                microphone = audioContext.createMediaStreamSource(stream);
                microphone.connect(microphoneLevel);
                $microphone.attr('disabled', true);
                $microphoneLevel.removeClass('hidden');
            },
            function(error) {
                $microphone[0].checked = false;
                window.alert("Could not get audio input.");
            });
});

// encoding process selector
var encodingProcess = 'separate';       // separate | background | direct

$encodingProcess.click(function(event) {
    encodingProcess = $(event.target).attr('mode');
});

// processor buffer size
var BUFFER_SIZE = [256, 512, 1024, 2048, 4096, 8192, 16384];

var defaultBufSz = (function() {
    processor = audioContext.createScriptProcessor(undefined, 2, 2);
    return processor.bufferSize;
})();

var iDefBufSz = BUFFER_SIZE.indexOf(defaultBufSz);

$bufferSize[0].valueAsNumber = iDefBufSz;   // initialize with browser default

function updateBufferSizeText() {
    var iBufSz = $bufferSize[0].valueAsNumber,
        text = "" + BUFFER_SIZE[iBufSz];
    if (iBufSz === iDefBufSz)
        text += ' (browser default)';
    $('#buffer-size-text').html(text);
}

updateBufferSizeText();         // initialize text

$bufferSize.on('input', function() { updateBufferSizeText(); });

// MP3 bit rate
var BIT_RATE = [64, 80, 96, 112, 128, 160, 192, 224, 256, 320];

$bitRate.on('input', function() {
    $('#bit-rate-text').html("" + BIT_RATE[$bitRate[0].valueAsNumber] + "kbps");
});

// save/delete recording
function saveRecording(blob) {
    var time = new Date(),
        url = URL.createObjectURL(blob),
        html = "<p recording='" + url + "'>" +
            "<audio controls src='" + url + "'></audio> " +
            time +
            " <a class='btn btn-default' href='" + url +
            "' download='recording.wav'>" +
            "Save...</a> " +
            "<button class='btn btn-danger' recording='" +
            url + "'>Delete</button>" +
            "</p>";
    $recordingList.prepend($(html));
}

$recordingList.on('click', 'button', function(event) {
    var url = $(event.target).attr('recording');
    $("p[recording='" + url + "']").remove();
    URL.revokeObjectURL(url);
});

// recording process
var worker = new Worker('js/EncoderWorker.js'),
    encoder = undefined;        // used on encodingProcess == direct

worker.onmessage = function(event) { saveRecording(event.data.blob); };

function getBuffers(event) {
    var buffers = [];
    for (var ch = 0; ch < 2; ++ch)
        buffers[ch] = event.inputBuffer.getChannelData(ch);
    return buffers;
}

function startRecordingProcess() {
    var bufSz = BUFFER_SIZE[$bufferSize[0].valueAsNumber],
        bitRate = BIT_RATE[$bitRate[0].valueAsNumber];
    processor = audioContext.createScriptProcessor(bufSz, 2, 2);
    input.connect(processor);
    processor.connect(audioContext.destination);
    if (encodingProcess === 'direct') {
        encoder = new Mp3LameEncoder(audioContext.sampleRate, bitRate);
        processor.onaudioprocess = function(event) {
            encoder.encode(getBuffers(event));
        };
    } else {
        worker.postMessage({
            command: 'start',
            process: encodingProcess,
            sampleRate: audioContext.sampleRate,
            bitRate: bitRate
        });
        processor.onaudioprocess = function(event) {
            worker.postMessage({ command: 'record', buffers: getBuffers(event) });
        };
    }
}

function stopRecordingProcess(finish) {
    input.disconnect();
    processor.disconnect();
    if (encodingProcess === 'direct')
        if (finish)
            saveRecording(encoder.finish());
        else
            encoder.cancel();
    else
        worker.postMessage({ command: finish ? 'finish' : 'cancel' });
}

// recording buttons interface
var startTime = null    // null indicates recording is stopped

function minSecStr(n) { return (n < 10 ? "0" : "") + n; }

function updateDateTime() {
    $dateTime.html((new Date).toString());
    if (startTime != null) {
        var sec = Math.floor((Date.now() - startTime) / 1000);
        $timeDisplay.html(minSecStr(sec / 60 | 0) + ":" + minSecStr(sec % 60));
    }
}

window.setInterval(updateDateTime, 200);

function disableControlsOnRecord(disabled) {
    if (microphone == null)
        $microphone.attr('disabled', disabled);
    $encodingProcess.attr('disabled', disabled);
    $bufferSize.attr('disabled', disabled);
    $bitRate.attr('disabled', disabled);
}

function startRecording() {
    startTime = Date.now();
    $recording.removeClass('hidden');
    $record.html('STOP');
    $cancel.removeClass('hidden');
    disableControlsOnRecord(true);
    startRecordingProcess();
}

function stopRecording(finish) {
    startTime = null;
    $timeDisplay.html('00:00');
    $recording.addClass('hidden');
    $record.html('RECORD');
    $cancel.addClass('hidden');
    disableControlsOnRecord(false);
    stopRecordingProcess(finish);
}

$record.click(function() {
    if (startTime != null)
        stopRecording(true);
    else
        startRecording();
});

$cancel.click(function() { stopRecording(false); });