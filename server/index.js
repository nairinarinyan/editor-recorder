const http = require('http');
const requestHandler = require('./lib/handler');
const port = process.env.PORT || 3000;
const Config = require('./lib/config');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');


const server = http.createServer((req, res) => {
    // proccess the request
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);
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
