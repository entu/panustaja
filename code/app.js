const path = require('path')
const fs  = require('fs')
const util = require('util')

const { app, clipboard, BrowserWindow, ipcMain } = require('electron')

let mainWindow

const userUrl = 'https://entu.keeleressursid.ee/api2/user'
const authUrl = userUrl + '/auth'

const ISDEV = process.env.DEV ? true : false

const pjsonPath = path.join(__dirname, '..', 'package.json')
let pjson = require(pjsonPath)
if (ISDEV) {
    pjson.build++
    fs.writeFileSync(pjsonPath, JSON.stringify(pjson, null, 2))
}
const appBuildNr = pjson.build
const appVersion = pjson.version
const appName = pjson.name

console.log('----==== ' + appName + ' v.' + appVersion + ' (build ' + (appBuildNr) + ') ====----')
const authWindowTitle = appName + ' v.' + appVersion + (appVersion.indexOf('-') > -1 ? appBuildNr : '') + ' | Logi sisse'

const appWebPreferences =  {
    partition: 'persist:panustaja (build ' + (appBuildNr) + ')',
    pageVisibility: true,
    worldSafeExecuteJavaScript: true
}
const rendererWebPreferences =  {
    partition: 'persist:panustaja (build ' + (appBuildNr) + ')',
    pageVisibility: true,
    nodeIntegration: true,
    enableRemoteModule: true,
    worldSafeExecuteJavaScript: true
}

app.on('ready', function() {
    const authWin = new BrowserWindow({
        width: 793, height: 490,
        webPreferences: appWebPreferences
    })
    authWin.loadURL(authUrl, {userAgent: 'Chrome'})
    authWin.center()
    authWin.setTitle(authWindowTitle)

    authWin.webContents.on('did-get-response-details', function(e, s, newUrl) {
        authWin.setTitle(authWindowTitle)
        if (newUrl === userUrl || newUrl === userUrl + '#') {
            authWin.hide()
        }
    })
    authWin.webContents.on('did-finish-load', function() {
        authWin.setTitle(authWindowTitle)
        const newUrl = authWin.webContents.getURL()
        if (newUrl === userUrl || newUrl === userUrl + '#') {
            clipboard.clear()
            authWin.webContents.selectAll()
            authWin.webContents.copy()

            setTimeout(function () {
                mainWindow = new BrowserWindow({ width: 793, height: 490, show: true, webPreferences: rendererWebPreferences })
                mainWindow.setTitle('Panustaja')
                mainWindow.center()
                const viewPath = path.join(app.getAppPath(), 'code', 'panuView.html')
                mainWindow.webContents.loadURL('file://' + viewPath)
                if (ISDEV) {
                    mainWindow.webContents.openDevTools(true)
                }
                authWin.close()
                delete authWin
            }, 1000)
        } else {
            return
        }
    })

})

ipcMain.on('log', function(event, message) {
    console.log('message: ', message)
})
ipcMain.on('data', function(event, message) {
    console.log('data: ' + JSON.stringify(message, null, 4))
})

ipcMain.on('setTitle', function(event, message) {
    mainWindow.setTitle(message)
})

var userData = false
// console.log('userData: ' + JSON.stringify(userData, null, 4))
ipcMain.on('setUser', function(event, data) {
    userData = data
    // console.log('setUser: ' + JSON.stringify(userData, null, 4))
})
ipcMain.on('getUser', function(event) {
    event.returnValue = userData
    // console.log('getUser: ' + JSON.stringify(userData, null, 4))
})

app.on('window-all-closed', function() {
    app.quit()
})
