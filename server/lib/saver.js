const fs = require('fs');

class Saver {
    constructor() {
        this.init();
    }

    init() {
        this.file = fs.createWriteStream('./server/output/result.mp3');
    }

    saveChunk(chunk) {
        this.file.write(chunk);
    }

    done() {
        this.file.end();
        console.log("The file was succesfully saved!");
    }
}

module.exports = Saver;
