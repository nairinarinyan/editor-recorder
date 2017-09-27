const Saver = require('./saver');

class requestHandler {
    constructor(){
        this.saver = new Saver();
    }

    proccess(request) {
        request.on('error', (err) => {
            console.error(err);
        }).on('data', (chunk) => {
            this.saver.saveChunk(chunk);
        }).on('end', () => {
            this.saver.done();
        });
    }
};

module.exports = function(req) {
    const handler = new requestHandler();

    return handler.proccess(req);
};
