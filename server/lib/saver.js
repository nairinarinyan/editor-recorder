const fs = require('fs');
const Config = require('./config');

class Saver {
    constructor() {
        this.init();
    }

    init() {
        this.file = fs.createWriteStream(Config.SOUND_FILE_NAME);
    }

    saveChunk(chunk) {
        this.file.write(chunk);
    }

    done() {
        this.file.end();
        console.log("The file was succesfully saved!", Config.SOUND_FILE_NAME);
    }
}

module.exports = Saver;
