const {
    app,
    BrowserWindow,
} = require('electron')
const path = require('path')
const Store = require('electron-store');
const url = require('url')
const ipc = require('electron').ipcMain;
const child_process = require('child_process')
const API_DEBUG = true & false;
const API = require(__dirname + "/js/api")
let can_close = false
const store = new Store();


ipc.on('start_backend', (event, pyPort) => {
    if (API_DEBUG) {
        pyPort = 9999
    } else {
        if (global['pyProc']) {
            global['pyProc'].kill();
        }
        if (API.client) {

            API.client.close();
        }
        global['pyProc'] = null;
        let exec_file = process.platform == "win32" ? "main.exe" : "main";
        const root_dir = process.env.ELECTRON_ENV ? __dirname :  path.dirname(process.resourcesPath);
        console.log("ROOT_DIR: " + root_dir)
        let script = path.join(root_dir, 'backend', 'dist', 'main', exec_file)
        if (global['pyProc'] == null) {
            global['pyProc'] = child_process.execFile(script, [pyPort,], function (err, stdout, stderr) {
                // Node.js will invoke this callback when process terminates.
                console.log(err)
                console.error(stderr)
                console.error(stdout);
            });
        }
    }
    console.log("start backend at tcp://127.0.0.1:" + pyPort)
});

app.on('ready', createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (win === null) {
        createWindow()
    }
})

function createWindow() {
    // Create the browser window.
    win = new BrowserWindow({
        width: 800,
        height: 500,
        icon: __dirname + '/images/favicon.png',
        frame: store.get("setting_system_border") == true,
        transparent: true,
        backgroundColor: "#00000000",
//        'node-integration': true,
//        skipTaskbar: true,
        toolbar: false,
        webPreferences: {
            nodeIntegration: true
        }
    })
    win.setMenuBarVisibility(false)

    win.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }))

    // Open DevTools.
//    win.webContents.openDevTools()
    // When Window Close.
    win.on('close', (event)=>{
        win.webContents.send("stop_backend")
        exitPyProc();
        if (!can_close)
            event.preventDefault();
    })
    win.on('closed', (event) => {
        win = null

    })

    ipc.on('close', ()=>{
        can_close = true;
        win.close()
    })

}



const exitPyProc = () => {
    win.webContents.send("stop_backend");
    if (global['pyProc']) {
    const { exec } = require("child_process");
        try {
            console.log("killing " + global['pyProc'].pid)
            global['pyProc'].kill()
        } catch (e) {
            console.log("can't kill!")
        }
    }
}

app.on('will-quit', exitPyProc)

