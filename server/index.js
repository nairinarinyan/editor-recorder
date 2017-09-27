const http = require('http');
const requestHandler = require('./lib/handler');
const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    // proccess the request
    requestHandler(req);

    res.statusCode = 204; // NO CONTENT
    res.end();
});

server.listen(port, (err) => {
  if (err) {
    return console.log('something went teribally wrong', err)
  }

  console.log(`server is listening on ${port}`)
})
