var zerorpc = require("zerorpc");
const path = require('path')
const API = {
    client: null,
    init: (addr) => {
        console.log("initlize")
        API.client = new zerorpc.Client();
        API.client.connect(addr);
    },
    start: () => {
        const child_process = require('child_process')
        let pyPort = 1024 + ~~(30000 * Math.random());
        pyPort = 9999
        if (global['pyProc']) {
            global['pyProc'].kill();

        }
        if (API.client) {
            API.client.close()
        }
        global['pyProc'] = null;
        let exec_file = process.platform == "win32" ? "main.exe" : "main";
        let script = path.join(__dirname, '..', 'backend', 'dist', exec_file)
        console.log(script)
        while (global['pyProc'] == null) {
            pyPort++;
            global['pyProc'] = child_process.execFile(script, [pyPort,], function (err, stdout, stderr) {
                // Node.js will invoke this callback when process terminates.
                console.log(err)
                console.error(stderr)
                console.error(stdout);
            });
        }
        pid = global['pyProc'].pid;
        console.log(pid)
        try {
            child_process.spawn("renice", ['-19', pid]);
        } catch(e){console.log(e)}
        API.init("tcp://127.0.0.1:" + pyPort);
        console.log(API.client)
        global['client'] = API.client
        console.log("start backend at tcp://127.0.0.1:" + pyPort)
    },
}
module.exports = API;
