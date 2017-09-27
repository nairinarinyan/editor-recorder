export class requestHandler {
    contentBody = [];
    proccess(request) {
        request.on('error', (err) => {
            console.error(err);
        }).on('data', (chunk) => {
            this.contentBody.push(chunk);
        }).on('end', () => {
            let body = Buffer.concat(this.contentBody).toString();
            
            // store it on file system
        });
    }
};

export function handle(req) {
    const handler = new requestHandler();

    return handler.proccess(req);
};
