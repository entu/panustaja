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


IS_DEV = process.env.DEV ? true : false

var pjson_path = path.join(__dirname, '..', 'package.json')
var pjson = require(pjson_path)
if (IS_DEV) {
    pjson.build++
    console.log('----==== ' + pjson.name + ' v.' + pjson.version + ' (build ' + (pjson.build) + ') ====----')
    fs.writeFileSync(pjson_path, JSON.stringify(pjson, null, 4))
}

app.on('ready', function() {
    USER_PATH = path.join(app.getPath('temp'), 'user.json')

    // windows['authWindow'] = new BrowserWindow({ width: 900, height: 600, show: true, "web-preferences": {partition: ''} })
    windows['authWindow'] = new BrowserWindow({ width: 900, height: 600, show: true, "web-preferences": {partition: "persist:panustaja (build " + (pjson.build) + ")"} })
    var title = pjson.name + ' v.' + pjson.version + (pjson.version.indexOf('-') > -1 ? pjson.build : '') + ' | Logi sisse'
    windows['authWindow'].center()
    windows['authWindow'].setTitle(title)
    windows['authWindow'].loadUrl(auth_url)
    windows['authWindow'].webContents.on('did-get-response-details', function(e, s, new_url) {
        windows['authWindow'].setTitle(title)
        if (new_url === user_url || new_url === user_url + '#') {
            windows['authWindow'].hide()
        }
    })
    windows['authWindow'].webContents.on('did-finish-load', function() {
        windows['authWindow'].setTitle(title)
        var new_url = windows['authWindow'].webContents.getUrl()
        if (new_url === user_url || new_url === user_url + '#') {
            mainWindow = new BrowserWindow({ width: 900, height: 600, show: true })
            mainWindow.setTitle('Panustaja')
            mainWindow.center()
            // require('dialog').showMessageBox({type:'info', message:'OK\n"' + windows['authWindow'].webContents.getUrl() + '"'
            //     + '\n==='
            //     + '\n"' + user_url + '"'
            //     , buttons:['ok']
            // })
            // console.log(windows['authWindow'].webContents.session.cookies);
            windows['authWindow'].webContents.savePage(USER_PATH, 'HTMLOnly', function(err) {
                if (err) {
                    require('dialog').showMessageBox({type:'info', message:'peale salvestamist: katki' + err, buttons:['ok']})
                    console.log("Error:", err)
                    process.exit()
                } else {
                    var view_path = path.join(app.getAppPath(), 'code', 'views', 'main.jade')
                    // require('dialog').showMessageBox({type:'info', message:'peale salvestamist: korras\n'
                    //     + 'Laen lehte: file://' + view_path, buttons:['ok']})
                    mainWindow.webContents.loadUrl('file://' + view_path)
                    windows['authWindow'].hide()
                    if (IS_DEV) {
                        mainWindow.webContents.openDevTools(true)
                    }
                    // require('dialog').showMessageBox({type:'info', message:'fail suletud: ' + USER_PATH, buttons:['ok']})
                }
            })
        } else {
            // require('dialog').showMessageBox({type:'info', message:'"' + new_url + '"'
            //     + '\n!=='
            //     + '\n"' + user_url + '"'
            //     , buttons:['ok']
            // })
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

ipc.on('closeAuth', function(event) {
    if (windows['authWindow']) {
        windows['authWindow'].close()
        delete windows['authWindow']
    }
})

app.on('window-all-closed', function() {
    app.quit()
})
