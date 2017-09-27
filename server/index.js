const http = require('http');
const UsbMonitor = require('./lib/UsbMonitor');
const requestHandler = require('./lib/handler');
const port = process.env.PORT || 3000;
const Config = require('./lib/config');
const fs = require('fs');
const path = require('path');


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

const usbMonitor = new UsbMonitor();

//usbMonitor.watchFor(Config.USB_VENDOR_ID,Config.USB_DEVICE_ID, (unmount)=>{

usbMonitor.watchForAnythingThatMoves((unmount)=>{
    console.log('HEY USB', unmount);
    if (!unmount) {
        setTimeout(() => {
            usbMonitor.getUsbDrives(Config.USB_DRIVE_DESCRIPTOR).then((drives) => {
                if (drives && drives.length > 0) {
                    let drive = drives[0], savePath = drive.mountpoints[0].path;
                    //Store in root of drive
                    console.log(savePath);
                    let p = path.join(savePath,'sound.mp3');
                    if (fs.existsSync(Config.SOUND_FILE_NAME)) {
                        fs.createReadStream(Config.SOUND_FILE_NAME).pipe(fs.createWriteStream(p));
                        fs.unlinkSync(Config.SOUND_FILE_NAME);
                    } else {
                        console.log('NOTHING TO BURN');
                    }
                }
            }).catch((e) => {
                console.warn(e);
            });
        }, 2000);
    }
});

server.listen(port, (err) => {
  if (err) {
    return console.log('something went teribally wrong', err)
  }

  console.log(`server is listening on ${port}`)
})
