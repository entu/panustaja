var app = require('app')
// var op  = require('object-path')
var path = require('path')
var fs  = require('fs')
var ipc = require('ipc')
var clipboard = require('clipboard')
var BrowserWindow = require('browser-window')

var windows = {}
var mainWindow

var user_url = 'https://entu.keeleressursid.ee/api2/user'
var auth_url = user_url + '/auth'


IS_DEV = process.env.DEV ? true : false

var pjson_path = path.join(__dirname, '..', 'package.json')
var pjson = require(pjson_path)
if (IS_DEV) {
    pjson.build++
    fs.writeFileSync(pjson_path, JSON.stringify(pjson, null, 2))
}
console.log('----==== ' + pjson.name + ' v.' + pjson.version + ' (build ' + (pjson.build) + ') ====----')

var web_preferences = {
    'partition': 'persist:panustaja (build ' + (pjson.build) + ')',
    'page-visibility': true, // Prevent throttling DOM timers (app gets less priority while in background)
}
app.on('ready', function() {
    windows.authWindow = new BrowserWindow({ width: 900, height: 600, show: true, 'web-preferences': web_preferences })
    // windows.authWindow.webContents.openDevTools(true)
    var title = pjson.name + ' v.' + pjson.version + (pjson.version.indexOf('-') > -1 ? pjson.build : '') + ' | Logi sisse'
    windows.authWindow.center()
    windows.authWindow.setTitle(title)
    windows.authWindow.loadUrl(auth_url)
    windows.authWindow.webContents.on('did-get-response-details', function(e, s, new_url) {
        windows.authWindow.setTitle(title)
        if (new_url === user_url || new_url === user_url + '#') {
            windows.authWindow.hide()
        }
    })
    windows.authWindow.webContents.on('did-finish-load', function() {
        windows.authWindow.setTitle(title)
        var new_url = windows.authWindow.webContents.getUrl()
        if (new_url === user_url || new_url === user_url + '#') {
            clipboard.clear()
            windows.authWindow.webContents.selectAll()
            windows.authWindow.webContents.copy()

            setTimeout(function () {
                mainWindow = new BrowserWindow({ width: 900, height: 600, show: true, 'web-preferences': web_preferences })
                mainWindow.setTitle('Panustaja')
                mainWindow.center()
                var view_path = path.join(app.getAppPath(), 'code', 'panu_view.html')
                mainWindow.webContents.loadUrl('file://' + view_path)
                mainWindow.webContents.openDevTools(true)
                if (IS_DEV) {
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

var user_data = false
// console.log('user_data: ' + JSON.stringify(user_data, null, 4))
ipc.on('setUser', function(event, data) {
    user_data = data
    // console.log('setUser: ' + JSON.stringify(user_data, null, 4))
})
ipc.on('getUser', function(event) {
    event.returnValue = user_data
    // console.log('getUser: ' + JSON.stringify(user_data, null, 4))
})

app.on('window-all-closed', function() {
    app.quit()
})
