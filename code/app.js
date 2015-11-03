var app = require('app')
var op  = require('object-path')
var fs  = require('fs')
var ipc = require('ipc')
BrowserWindow = require('browser-window')

var user_url = 'https://entu.keeleressursid.ee/api2/user'
var auth_url = user_url + '/auth'
// var authWindow
// var mainWindow
var user_data = {}

app.on('ready', function() {
    authWindow = new BrowserWindow({ width: 300, height: 600, show: true })
    authWindow.setTitle('Panustaja - log in')
    // authWindow.loadUrl('http://ww.ee')
    authWindow.loadUrl(auth_url)
    authWindow.webContents.on('did-finish-load', function() {
        authWindow.webContents.savePage('./user.json', 'HTMLOnly', function(err) {
            if (err) {
                console.log("Error:", err)
                process.exit()
            } else {
                fs.readFile('./user.json', 'utf8', function(err, data) {
                    data = JSON.parse(data)
                    if (op.get(data, 'result.user_id', false)) {
                        user_data['user_id'] = op.get(data, 'result.user_id')
                        user_data['session_key'] = op.get(data, 'result.session_key')
                        user_data['name'] = op.get(data, 'result.name')
                        // console.log(JSON.stringify(data, null, 4))
                    } else {
                        console.log('User data incomplete.')
                        console.log(JSON.stringify(data, null, 4))
                    }
                    fs.unlink('./user.json', function (err) {
                        if (err) {
                            console.log("Error:", err)
                            process.exit()
                        }
                    })
                    mainWindow = new BrowserWindow({ width: 900, height: 600, show: true })
                    mainWindow.setTitle('Panustaja - ' + user_data['name'])
                    mainWindow.center()
                    mainWindow.loadUrl('file://' + __dirname + '/main.html')
                    authWindow.close()
                    mainWindow.webContents.openDevTools(true)

                    // var dialog = require('dialog')
                    // dialog.showErrorBox('FOO', 'bar, baz')
                    // console.log(dialog.showOpenDialog(mainWindow, { properties: [ 'openDirectory' ]}))

                })
            }
        })
    })
})

ipc.on('log', function(event, message) {
    console.log('message: ' + message)
})
ipc.on('data', function(event, message) {
    console.log('data: ' + JSON.stringify(message, null, 4))
})

ipc.on('userdata-query', function(event) {
    console.log('Sent user data', JSON.stringify(user_data, null, 4))
    event.sender.send('userdata-reply', user_data)
})
