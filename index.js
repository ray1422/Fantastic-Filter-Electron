const {
    app,
    BrowserWindow,
} = require('electron')
const path = require('path')
const storage = require('electron-localstorage');
const url = require('url')

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
        frame: storage.getItem("setting_system_border") == true,
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
    win.on('closed', () => {
        win = null
    })

}



const exitPyProc = () => {
    global['pyProc'] && global['pyProc'].kill()

}

app.on('will-quit', exitPyProc)

