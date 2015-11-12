var app = require('app')
var op  = require('object-path')
var path = require('path')
var fs  = require('fs')
var ipc = require('ipc')
var j = require('electron-jade')({pretty: true}, {})
var BrowserWindow = require('browser-window')

var user_url = 'https://entu.keeleressursid.ee/api2/user'
var auth_url = user_url + '/auth'

console.log(auth_url)
app.on('ready', function() {
    var home_path = app.getPath('home')
//
    mainWindow = new BrowserWindow({ width: 900, height: 600, show: true })
//     var title = pjson.name + ' v.' + pjson.version + (pjson.version.indexOf('-') > -1 ? pjson.build : '') + ' | Logi sisse'
    var view_path = path.join(__dirname, 'code', 'views', 'test.jade')
    mainWindow.webContents.loadUrl('file://' + view_path)
//
//     mainWindow.center()
//     mainWindow.setTitle(title)
//     mainWindow.loadUrl(auth_url)
//     mainWindow.webContents.on('did-get-response-details', function(e, s, new_url) {
    })
//
// app.on('window-all-closed', function() {
//     app.quit()
// })
