var zerorpc = require("zerorpc");
const path = require('path');
const ipc = require('electron').ipcRenderer;
const remote = require('electron').remote;


const API = {
    client: null,
    init: (addr) => {
        console.log("initialize API")
        API.client = new zerorpc.Client();
        API.client.connect(addr);
    },
    start: () => {
        let pyPort = 1025 + ~~(30000 * Math.random());
//        pyPort = 9999;
        ipc.send('start_backend', pyPort)
        API.init("tcp://127.0.0.1:" + pyPort);
        global['client'] = API.client
        ipc.on('stop_backend', ()=>{
            global['client'].invoke("stop_server", "", ()=>{
                ipc.send('close');
            });
            setTimeout(function(){ipc.send('close')}, 300);
        })
    },
}


global.sharedObj = {prop1: null};
module.exports = API;
