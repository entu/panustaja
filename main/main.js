var app = require('app')
var fs  = require('fs')
var ipc = require('ipc')
var BrowserWindow = require('browser-window')
var onlineStatusWindow

var user_url = 'https://entu.keeleressursid.ee/api2/user'
var auth_url = user_url + '/auth'

app.on('ready', function() {
    authWindow = new BrowserWindow({ width: 900, height: 600, show: true })
    authWindow.loadUrl(auth_url)
    console.log('ready')

    authWindow.webContents.savePage('./user.json', 'HTMLOnly', function(err) {
        if (err) {
            console.log("err", err)
        } else {
            console.log("Save page successfully")
            fs.readFile('./user.json', 'utf8', function(err, data) {
                console.log( JSON.stringify(JSON.parse(data), null, 4))
                fs.unlink('./user.json', function (err) {
                    if (err) throw err
                    console.log('successfully deleted user.json')
                })
            })
        }
    })
})



ipc.on('online-status-changed', function(event, status) {
    console.log(status)
})

ipc.on('message', function(event, message) {
    // console.log('event: ' + JSON.stringify(event, null, 4))
    console.log('message: ' + message)
})
ipc.on('user', function(event, data) {
    // console.log('event: ' + JSON.stringify(event, null, 4))
    console.log('data: ' + JSON.stringify(data, null, 4))
})
