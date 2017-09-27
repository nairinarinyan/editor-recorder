const monitor = require('node-usb-detection'),
    drivelist = require('drivelist');
class UsbMonitor {
    constructor() {
        console.log("Usb Devices:\n", monitor.list());
    }
    watchFor(vendorId, deviceId, callback) {
        monitor.add((device) => {
            console.log('Device added!', device);
            if (device.deviceDescriptor.idVendor === vendorId && device.deviceDescriptor.idProduct === deviceId) {
                callback(false);
            }
        });
        monitor.remove((device) => {
            if (device.deviceDescriptor.idVendor === vendorId && device.deviceDescriptor.idProduct === deviceId) {
                callback(true);
            }
        });
    }

    watchForAnythingThatMoves(callback){
        monitor.add((device) => {
            console.log('Device added!', device);
            callback(false);
        });
        monitor.remove((device) => {
            callback(true);
        });
    }

    getUsbDrives(deviceNameSearch) {
        return new Promise((resolve, reject) => {
            drivelist.list((error, disks) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(disks.filter((disk) => {
                        return disk.description.match(deviceNameSearch) !== null;
                    }));
                }
            });
        });
    }
}
module.exports = UsbMonitor;
