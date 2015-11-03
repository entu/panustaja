var request = require('request')
var fs = require('fs')
var op = require('object-path')
var path = require('path')
var async = require('async')
var mime = require('mime-types')

// TODO: WATCH: mmmagic is broken currently: Module version mismatch. Expected 46, got 14
// var Magic = require('mmmagic').Magic
// var magic = new Magic(mmm.MAGIC_MIME_TYPE | mmm.MAGIC_MIME_ENCODING)
// usage:                 magic.detectFile(_path, function(err, result) {

var remote = require('remote')
var dialog = remote.require('dialog')

var ipc = require('ipc')
ipc.send('userdata-query')
ipc.on('userdata-reply', function(user_data) {
    document.getElementById('user_name').innerHTML = user_data.name
})

var resource = {}
var resource_stats = {}
var dom_resource_name = document.getElementById('resource_name')
dom_resource_name.setAttribute('hidden', '')

function selectLocal () {
    resource = {name: 'root'}
    resource_stats = {files: 0, directories: 0, mime:{}}
    dialog.showOpenDialog({properties:['openFile', 'openDirectory', 'multiSelections']}, function selectedPath(_paths) {
        dom_resource_name.removeAttribute('hidden')
        dom_resource_name.value = ''
        if (_paths.length === 1) {
            var single_file = _paths[0]
            op.set(resource, 'name', single_file)
            dom_resource_name.value = resource.name
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
                            console.log('foo1', single_file + '+' + file + '=' + fullpath)
                            return fullpath
                        })
                        console.log('foo1');
                        recurseLocal(resource, _paths, resourceLoaded)
                    })
                } else {
                    console.log('foo2');
                    recurseLocal(resource, _paths, resourceLoaded)
                }
            })
        } else {
            console.log('foo3');
            recurseLocal(resource, _paths, resourceLoaded)
        }
    })
}

var resourceLoaded = function resourceLoaded() {
    console.log(JSON.stringify(resource, null, 4))
    console.log(JSON.stringify(resource_stats, null, 4))
}

var recurseLocal = function recurseLocal(parent_resource, paths, loadedCB) {
    console.log(JSON.stringify(paths, null, 4))
    async.each(paths, function iterator(_path, callback) {
        fs.stat(_path, function(err, stats) {
            console.log('stats for:', _path)
            if (stats.isFile()) {
                resource_stats.files ++
                op.push(parent_resource, 'files', _path)
                var mimetype = mime.lookup(_path) || 'unknown'
                op.set(resource_stats, ['mimetypes', mimetype], op.get(resource_stats, ['mimetypes', mimetype], 0) + 1)
                console.log('file', _path, mimetype)
                callback()
            } else if (stats.isDirectory()) {
                resource_stats.directories ++
                var directory = {name: _path}
                op.push(parent_resource, 'resources', directory)
                console.log('dir: ' + JSON.stringify(_path, null, 4))
                fs.readdir(_path, function(err, files) {
                    if (err) {
                        return callback(err)
                    }
                    var _paths = files.map(function(file) {
                        var fullpath = path.join(_path, file)
                        console.log(_path + '+' + file + '=' + fullpath)
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
