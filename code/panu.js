var fs = require('fs')
var op = require('object-path')
var path = require('path')
var async = require('async')
var mime = require('mime')

const { clipboard, dialog } = require('electron').remote
const { ipcRenderer } = require('electron')

var pjson = require(path.join(__dirname, '..', 'package.json'))
UPLOADERVERSION = pjson.name + ' v.' + pjson.version + (pjson.version.indexOf('-') > -1 ? pjson.build : '')


var b2s = require(path.join(__dirname, 'bytesToSize.js'))
var uploader = require(path.join(__dirname, 'upload.js'))

var userData = {}
var data = ipcRenderer.sendSync('getUser', null)

function setFormState(state) {
    switch(state) {
        case 'select':
            document.getElementById('selectLocal').removeAttribute('hidden')
            // ---
            document.getElementById('loading').setAttribute('hidden', '')
            document.getElementById('resourceStats').setAttribute('hidden', '')
            document.getElementById('uploading').setAttribute('hidden', '')
            document.getElementById('uploadResource').setAttribute('hidden', '')
            document.getElementById('resourceName').setAttribute('hidden', '')
            // ---
            // document.getElementById('uploading').removeAttribute('hidden')
            break
        case 'loading':
            document.getElementById('loading').removeAttribute('hidden')
            document.getElementById('resourceStats').removeAttribute('hidden')
            // -------- //
            document.getElementById('uploading').setAttribute('hidden', '')
            document.getElementById('uploadResource').setAttribute('hidden', '')
            document.getElementById('selectLocal').setAttribute('hidden', '')
            document.getElementById('resourceName').setAttribute('hidden', '')
            break
        case 'loaded':
            document.getElementById('resourceStats').removeAttribute('hidden')
            document.getElementById('uploadResource').removeAttribute('hidden')
            document.getElementById('selectLocal').removeAttribute('hidden')
            document.getElementById('selectLocalButton').innerHTML = 'Vali uuesti'
            document.getElementById('resourceName').removeAttribute('hidden')
            // -------- //
            document.getElementById('loading').setAttribute('hidden', '')
            document.getElementById('uploading').setAttribute('hidden', '')
            break
        case 'uploading':
            document.getElementById('uploading').removeAttribute('hidden')
            // -------- //
            document.getElementById('loading').setAttribute('hidden', '')
            document.getElementById('resourceStats').setAttribute('hidden', '')
            document.getElementById('uploadResource').setAttribute('hidden', '')
            document.getElementById('selectLocal').setAttribute('hidden', '')
            document.getElementById('resourceName').setAttribute('hidden', '')
            break
        case 'uploaded':
            document.getElementById('thankYou').removeAttribute('hidden')
            // -------- //
            document.getElementById('resourceStats').setAttribute('hidden', '')
            document.getElementById('uploadResource').setAttribute('hidden', '')
            document.getElementById('selectLocal').setAttribute('hidden', '')
            document.getElementById('selectLocalButton').innerHTML = 'Vali uuesti'
            document.getElementById('resourceName').setAttribute('hidden', '')
            document.getElementById('loading').setAttribute('hidden', '')
            document.getElementById('uploading').setAttribute('hidden', '')
            break
    }
}



var resource = {}
var resourceStats = {}
var rendererInterval


function renderResource() {
    // console.log(JSON.stringify(op.get(resourceStats, 'mime'), null, 2))
    document.getElementById('resourceStats').removeAttribute('hidden')
    document.getElementById('resourceDirectories').innerHTML = ''
    document.getElementById('resourceFiles').innerHTML = ''
    document.getElementById('mimeStats').innerHTML = ''
    document.getElementById('resourceDirectories').appendChild(document.createTextNode('Katalooge: ' + resourceStats.directories.count))
    document.getElementById('resourceFiles').appendChild(document.createTextNode('Faile: ' + resourceStats.files.count + ' | ' + b2s(resourceStats.files.size)))
    Object.keys(resourceStats.mime).forEach(function (mimeTypeName) {
        var textNode = document.createTextNode(
            mimeTypeName
            + ': ' + op.get(resourceStats, ['mime', mimeTypeName, 'count'])
            + ' | ' + b2s(op.get(resourceStats, ['mime', mimeTypeName, 'size']))
        )
        var liNode = document.createElement('LI')
        liNode.appendChild(textNode)
        document.getElementById('mimeStats').appendChild(liNode)
    })
}

function resourceLoaded() {
    renderResource()
    setFormState('loaded')
    clearInterval(rendererInterval)
    // ipcRenderer.send('data', resource)
    document.getElementById('uploadResourceButton').onclick = function uploadResource() {
        uploader.upload()
    }
}

function registerMime(parentResource, filepath, filesize, callback) {
    resourceStats.files.count++
    resourceStats.files.size += filesize
    var mimetype = mime.lookup(filepath)
    op.push(parentResource, 'files', filepath)
    op.set(resourceStats, ['mime', mimetype, 'count'], op.get(resourceStats, ['mime', mimetype, 'count'], 0) + 1)
    op.set(resourceStats, ['mime', mimetype, 'size'], op.get(resourceStats, ['mime', mimetype, 'size'], 0) + filesize)
    callback()
}

function recurseLocal(parentResource, paths, loadedCB) {
    async.each(paths, function iterator(myPath, callback) {
        fs.stat(myPath, function(err, stats) {
            if (err) { return callback() }
            if (stats.isFile()) {
                registerMime(parentResource, myPath, stats.size, callback)
            }
            else if (stats.isDirectory()) {
                resourceStats.directories.count++
                var directory = {name: myPath}
                op.push(parentResource, 'resources', directory)
                fs.readdir(myPath, function(err, files) {
                    if (err) { return callback(err) }
                    var myPaths = files.map(function(file) {
                        return path.join(myPath, file)
                    })
                    recurseLocal(directory, myPaths, callback)
                })
            }
        })
    }, function(err){
        if( err ) {
            console.log('A file failed to process', err)
        } else {
            // console.log(JSON.stringify(op.get(resourceStats, 'mime'), null, 2))
            loadedCB()
        }
    })
}

document.getElementById('selectLocalButton').onclick = function selectLocal () {
    resource = {name: 'root'}
    resourceStats = {files: {count: 0, size: 0}, directories: {count: 0}, mime:{}}
    dialog.showOpenDialog({properties:['openFile', 'openDirectory']}, function selectedPath(myPaths) {
        if (!myPaths) { return }
        rendererInterval = setInterval(function () { renderResource() }, 100)
        setFormState('loading')
        if (myPaths.length === 1) {
            var singleFile = myPaths[0]
            op.set(resource, 'name', path.basename(singleFile))
            document.getElementById('resourceName').value = resource.name
            fs.stat(singleFile, function(err, stats) {
                if (err) { throw (err) }
                if (stats.isDirectory()) {
                    fs.readdir(singleFile, function(err, files) {
                        if (err) { throw (err) }
                        myPaths = files.map(function(file) {
                            var fullpath = path.join(singleFile, file)
                            return fullpath
                        })
                        recurseLocal(resource, myPaths, resourceLoaded)
                    })
                } else {
                    recurseLocal(resource, myPaths, resourceLoaded)
                }
            })
        } else {
            recurseLocal(resource, myPaths, resourceLoaded)
        }
    })
}



if (!data) {
    data = JSON.parse(clipboard.readText())
    clipboard.clear()
    ipcRenderer.send('setUser', data)
}
if (op.get(data, 'result.user_id', false)) {
    userData.userId = op.get(data, 'result.user_id')
    userData.sessionKey = op.get(data, 'result.session_key')
    userData.name = op.get(data, 'result.name')
    document.getElementById('userName').innerHTML = userData.name
    var title = UPLOADERVERSION + ' | ' + userData.name
    ipcRenderer.send('setTitle', title)
    setFormState('select')
} else {
    ipcRenderer.send('log', 'User data incomplete.')
    ipcRenderer.send('data', data)
}
ipcRenderer.send('closeAuth')
