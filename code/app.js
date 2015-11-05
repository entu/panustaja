var app = require('app')
var op  = require('object-path')
var path = require('path')
var fs  = require('fs')
var ipc = require('ipc')
var j = require('electron-jade')({pretty: true}, {})
var BrowserWindow = require('browser-window')

var windows = {}

var user_url = 'https://entu.keeleressursid.ee/api2/user'
var auth_url = user_url + '/auth'


var home_path = process.env.HOME ? process.env.HOME : process.env.HOMEPATH
USER_PATH = path.join(home_path, 'user.json')
IS_DEV = process.env.DEV ? true : false

var pjson_path = path.join(__dirname, '..', 'package.json')
var pjson = require(pjson_path)
if (IS_DEV) {
    pjson.build++
    console.log('----==== ' + pjson.name + ' v.' + pjson.version + ' (build ' + (pjson.build) + ') ====----')
    fs.writeFileSync(pjson_path, JSON.stringify(pjson, null, 4))
}

app.on('ready', function() {
    windows['authWindow'] = new BrowserWindow({ width: 350, height: 600, show: true, "web-preferences": {partition: "persist:panustaja (build " + (pjson.build) + ")"} })
    var title = pjson.name + ' v.' + pjson.version + (pjson.version.indexOf('-') > -1 ? pjson.build : '') + ' | Logi sisse.'
    windows['authWindow'].setTitle(title)
    windows['authWindow'].loadUrl(auth_url)
    windows['authWindow'].webContents.on('did-finish-load', function() {
        windows['authWindow'].setTitle(title)
        console.log(windows['authWindow'].webContents.getUrl())
        if (windows['authWindow'].webContents.getUrl() !== user_url
            && windows['authWindow'].webContents.getUrl() !== user_url + '#') {
            return
        }
        // require('dialog').showMessageBox({type:'info', message:'enne salvestamist: ' + USER_PATH, buttons:['ok']})
        windows['authWindow'].webContents.savePage(USER_PATH, 'HTMLOnly', function(err) {
            if (err) {
                require('dialog').showMessageBox({type:'info', message:'peale salvestamist: katki' + err, buttons:['ok']})
                console.log("Error:", err)
                process.exit()
            } else {
                // require('dialog').showMessageBox({type:'info', message:'peale salvestamist: korras', buttons:['ok']})
                mainWindow = new BrowserWindow({ width: 900, height: 600, show: true })
                mainWindow.setTitle('Panustaja')
                mainWindow.center()
                mainWindow.loadUrl('file://' + __dirname + '/views/main.jade')
                // windows['authWindow'].hide()
                if (IS_DEV) {
                    mainWindow.webContents.openDevTools(true)
                }
                // require('dialog').showMessageBox({type:'info', message:'fail suletud: ' + USER_PATH, buttons:['ok']})
            }
        })
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

ipc.on('closeAuth', function(event) {
    if (windows['authWindow']) {
        windows['authWindow'].close()
        delete windows['authWindow']
    }
})

app.on('window-all-closed', function() {
    app.quit()
})
