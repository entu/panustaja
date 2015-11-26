var app = require('app')
// var op  = require('object-path')
var path = require('path')
var fs  = require('fs')
var ipc = require('ipc')
var clipboard = require('clipboard')
var BrowserWindow = require('browser-window')

var windows = {}
var mainWindow

var userUrl = 'https://entu.keeleressursid.ee/api2/user'
var authUrl = userUrl + '/auth'


ISDEV = process.env.DEV ? true : false

var pjsonPath = path.join(__dirname, '..', 'package.json')
var pjson = require(pjsonPath)
if (ISDEV) {
    pjson.build++
    fs.writeFileSync(pjsonPath, JSON.stringify(pjson, null, 2))
}
console.log('----==== ' + pjson.name + ' v.' + pjson.version + ' (build ' + (pjson.build) + ') ====----')

var webPreferences = {
    'partition': 'persist:panustaja (build ' + (pjson.build) + ')',
    'page-visibility': true, // Prevent throttling DOM timers (app gets less priority while in background)
}
app.on('ready', function() {
    windows.authWindow = new BrowserWindow({ width: 900, height: 600, show: true, 'web-preferences': webPreferences })
    // windows.authWindow.webContents.openDevTools(true)
    var title = pjson.name + ' v.' + pjson.version + (pjson.version.indexOf('-') > -1 ? pjson.build : '') + ' | Logi sisse'
    windows.authWindow.center()
    windows.authWindow.setTitle(title)
    windows.authWindow.loadUrl(authUrl)
    windows.authWindow.webContents.on('did-get-response-details', function(e, s, newUrl) {
        windows.authWindow.setTitle(title)
        if (newUrl === userUrl || newUrl === userUrl + '#') {
            windows.authWindow.hide()
        }
    })
    windows.authWindow.webContents.on('did-finish-load', function() {
        windows.authWindow.setTitle(title)
        var newUrl = windows.authWindow.webContents.getUrl()
        if (newUrl === userUrl || newUrl === userUrl + '#') {
            clipboard.clear()
            windows.authWindow.webContents.selectAll()
            windows.authWindow.webContents.copy()

            setTimeout(function () {
                mainWindow = new BrowserWindow({ width: 900, height: 600, show: true, 'web-preferences': webPreferences })
                mainWindow.setTitle('Panustaja')
                mainWindow.center()
                var viewPath = path.join(app.getAppPath(), 'code', 'panuView.html')
                mainWindow.webContents.loadUrl('file://' + viewPath)
                if (ISDEV) {
                    mainWindow.webContents.openDevTools(true)
                }
                windows.authWindow.close()
                delete windows.authWindow
            }, 1000)
        } else {
            return
        }
    })
})

ipc.on('log', function(event, message) {
    console.log('message: ', message)
})
ipc.on('data', function(event, message) {
    console.log('data: ' + JSON.stringify(message, null, 4))
})

ipc.on('setTitle', function(event, message) {
    mainWindow.setTitle(message)
})

var userData = false
// console.log('userData: ' + JSON.stringify(userData, null, 4))
ipc.on('setUser', function(event, data) {
    userData = data
    // console.log('setUser: ' + JSON.stringify(userData, null, 4))
})
ipc.on('getUser', function(event) {
    event.returnValue = userData
    // console.log('getUser: ' + JSON.stringify(userData, null, 4))
})

app.on('window-all-closed', function() {
    app.quit()
})
