const path = require('path')
const fs  = require('fs')
const util = require('util')

// var op  = require('object-path')

// const app = require('electron').app
const { app, BrowserWindow, ipcMain, clipboard } = require('electron')
// var ipcMain = require('electron').ipcMain
// const { clipboard } = require('electron')

var windows = {}
var mainWindow

var userUrl = 'https://entu.keeleressursid.ee/api2/user'
var authUrl = userUrl + '/auth'


ISDEV = true
// ISDEV = process.env.DEV ? true : false

var pjsonPath = path.join(__dirname, '..', 'package.json')
var pjson = require(pjsonPath)
if (ISDEV) {
    pjson.build++
    fs.writeFileSync(pjsonPath, JSON.stringify(pjson, null, 2))
}
console.log('----==== ' + pjson.name + ' v.' + pjson.version + ' (build ' + (pjson.build) + ') ====----')

const webPreferences =  {
    partition: 'persist:panustaja (build ' + (pjson.build) + ')',
    // Prevent throttling DOM timers (app gets less priority while in background)
    pageVisibility: true,
    nodeIntegration: true
}

app.on('ready', function() {



    const authWin = new BrowserWindow({
        width: 600,
        height: 900,
        webPreferences: webPreferences
    })
    authWin.loadURL(authUrl, {userAgent: 'Chrome'})
    var title = pjson.name + ' v.' + pjson.version + (pjson.version.indexOf('-') > -1 ? pjson.build : '') + ' | Logi sisse'
    authWin.center()
    authWin.setTitle(title)


    authWin.webContents.on('did-get-response-details', function(e, s, newUrl) {
        authWin.setTitle(title)
        if (newUrl === userUrl || newUrl === userUrl + '#') {
            authWin.hide()
        }
    })
    authWin.webContents.on('did-finish-load', function() {
        authWin.setTitle(title)
        var newUrl = authWin.webContents.getURL()
        if (newUrl === userUrl || newUrl === userUrl + '#') {
            clipboard.clear()
            authWin.webContents.selectAll()
            authWin.webContents.copy()

            setTimeout(function () {
                mainWindow = new BrowserWindow({ width: 900, height: 600, show: true, webPreferences: webPreferences })
                mainWindow.setTitle('Panustaja')
                mainWindow.center()
                var viewPath = path.join(app.getAppPath(), 'code', 'panuView.html')
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
