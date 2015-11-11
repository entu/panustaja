var request = require('request')
var fs = require('fs')
var op = require('object-path')
var path = require('path')
var async = require('async')

var mmm = require('mmmagic')
var Magic = mmm.Magic
var magic = new Magic(mmm.MAGIC_MIME_TYPE | mmm.MAGIC_MIME_ENCODING)

var remote = require('remote')
var app = remote.require('app')
var dialog = remote.require('dialog')
var clipboard = remote.require('clipboard')

var pjson = require(path.join(__dirname, '..', 'package.json'))
UPLOADER_VERSION = pjson.name + ' v.' + pjson.version + (pjson.version.indexOf('-') > -1 ? pjson.build : '')

var ipc = require('ipc')

var b2s = require(path.join(__dirname, 'bytesToSize.js'))
var uploader = require(path.join(__dirname, 'upload.js'))

var user_data = {}
var data = ipc.sendSync('getUser', null)

var initialize = function initialize() {
    if (!data) {
        data = JSON.parse(clipboard.readText())
        clipboard.clear()
        ipc.send('setUser', data)
    }
    // console.log('user_data: ' + JSON.stringify(data, null, 4))
    if (op.get(data, 'result.user_id', false)) {
        user_data['user_id'] = op.get(data, 'result.user_id')
        user_data['session_key'] = op.get(data, 'result.session_key')
        user_data['name'] = op.get(data, 'result.name')
        document.getElementById('userName').innerHTML = user_data.name
        var title = UPLOADER_VERSION + ' | ' + user_data.name
        ipc.send('setTitle', title)
        setFormState('select')
    } else {
        ipc.send('log', 'User data incomplete.')
        ipc.send('data', data)
    }
    ipc.send('closeAuth')
}

var resource = {}
var resource_stats = {}
var renderer_interval

function selectLocal () {
    resource = {name: 'root'}
    resource_stats = {files: {count: 0, size: 0}, directories: {count: 0}, mime:{}}
    dialog.showOpenDialog({properties:['openFile', 'openDirectory', 'multiSelections']}, function selectedPath(_paths) {
        if (!_paths) {
            return
        }
        renderer_interval = setInterval(function () {
            renderResource()
        }, 100)
        setFormState('loading')
        if (_paths.length === 1) {
            var single_file = _paths[0]
            op.set(resource, 'name', path.basename(single_file))
            document.getElementById('resourceNameInput').value = resource.name
            fs.stat(single_file, function(err, stats) {
                if (err) {
                    throw (err)
                }
                if (stats.isDirectory()) {
                    fs.readdir(single_file, function(err, files) {
                        if (err) {
                            throw (err)
                        }
                        _paths = files.map(function(file) {
                            var fullpath = path.join(single_file, file)
                            return fullpath
                        })
                        recurseLocal(resource, _paths, resourceLoaded)
                    })
                } else {
                    recurseLocal(resource, _paths, resourceLoaded)
                }
            })
        } else {
            recurseLocal(resource, _paths, resourceLoaded)
        }
    })
}

var resourceLoaded = function resourceLoaded() {
    renderResource()
    setFormState('loaded')
    clearInterval(renderer_interval)
    if (document.getElementById('resourceNameInput').value === '') {
        document.getElementById('resourceNameInput').focus()
    }
    // ipc.send('data', resource)
    document.getElementById('uploadResourceButton').onclick = function uploadResource() {
        uploader.upload()
    }
}

var renderResource = function renderResource() {
    document.getElementById('resourceStats').removeAttribute('hidden')
    document.getElementById('resourceDirectories').innerHTML = ''
    document.getElementById('resourceFiles').innerHTML = ''
    document.getElementById('mimeStats').innerHTML = ''
    document.getElementById('resourceDirectories').appendChild(document.createTextNode('Katalooge: ' + resource_stats.directories.count))
    document.getElementById('resourceFiles').appendChild(document.createTextNode('Faile: ' + resource_stats.files.count + ' | ' + b2s(resource_stats.files.size)))
    Object.keys(resource_stats.mime).forEach(function (mime_type_name) {
        var text_node = document.createTextNode(
            mime_type_name
            + ': ' + op.get(resource_stats, ['mime', mime_type_name, 'count'])
            + ' | ' + b2s(op.get(resource_stats, ['mime', mime_type_name, 'size']))
        )
        var li_node = document.createElement('LI')
        li_node.appendChild(text_node)
        document.getElementById('mimeStats').appendChild(li_node)
    })
}

var recurseLocal = function recurseLocal(parent_resource, paths, loadedCB) {
    async.each(paths, function iterator(_path, callback) {
        fs.stat(_path, function(err, stats) {
            if (err) {
                return callback()
            }
            if (stats.isFile()) {
                magic.detectFile(_path, function(err, result) {
                    if (err) {
                        return callback()
                    }
                    resource_stats.files.count++
                    resource_stats.files.size += stats.size
                    op.push(parent_resource, 'files', _path)
                    var mime = result.split(';')[0]
                    var charset = result.split(';')[1].split('=')[1]
                    op.set(resource_stats, ['mime', mime, 'count'], op.get(resource_stats, ['mime', mime, 'count'], 0) + 1)
                    op.set(resource_stats, ['mime', mime, 'size'], op.get(resource_stats, ['mime', mime, 'size'], 0) + stats.size)
                    op.set(resource_stats, ['mime', mime, 'charsets', charset, 'count'], op.get(resource_stats, ['mime', mime, 'charsets', charset, 'count'], 0) + 1)
                    op.set(resource_stats, ['mime', mime, 'charsets', charset, 'size'], op.get(resource_stats, ['mime', mime, 'charsets', charset, 'size'], 0) + stats.size)
                    callback()
                })
            } else if (stats.isDirectory()) {
                resource_stats.directories.count++
                var directory = {name: _path}
                op.push(parent_resource, 'resources', directory)
                fs.readdir(_path, function(err, files) {
                    if (err) {
                        return callback(err)
                    }
                    var _paths = files.map(function(file) {
                        var fullpath = path.join(_path, file)
                        return fullpath
                    })
                    recurseLocal(directory, _paths, callback)
                })
            }
        })
    }, function(err){
        if( err ) {
            console.log('A file failed to process', err)
        } else {
            loadedCB()
        }
    })
}


var setFormState = function setFormState(state) {
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

initialize()
