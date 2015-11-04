var request = require('request')
var fs = require('fs')
var op = require('object-path')
var path = require('path')
var async = require('async')

var mmm = require('mmmagic')
var Magic = mmm.Magic
var magic = new Magic(mmm.MAGIC_MIME_TYPE | mmm.MAGIC_MIME_ENCODING)

var remote = require('remote')
var dialog = remote.require('dialog')

var ipc = require('ipc')
ipc.send('userdata-query')
ipc.on('userdata-reply', function(user_data) {
    document.getElementById('userName').innerHTML = user_data.name
})

var b2s = require(path.join(__dirname, '..', 'bytesToSize.js'))

var resource = {}
var resource_stats = {}
var dom_resource_name = document.getElementById('resourceName')
var dom_resource_stats = document.getElementById('resourceStats')
dom_resource_name.setAttribute('hidden', '')

function selectLocal () {
    resource = {name: 'root'}
    resource_stats = {files: {count: 0, size: 0}, directories: {count: 0}, mime:{}}
    dialog.showOpenDialog({properties:['openFile', 'openDirectory', 'multiSelections']}, function selectedPath(_paths) {
        setFormState('loading')
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
                            // console.log('foo1', single_file + '+' + file + '=' + fullpath)
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
    setFormState('select')
    console.log(JSON.stringify(b2s(resource_stats.files.size), null, 4))
    console.log(resource_stats.files.size)
    ipc.send('data', resource_stats)
    renderResource()
}

var renderResource = function renderResource() {
    dom_resource_stats.removeAttribute('hidden')
    document.getElementById('resourceDirectories').innerHTML = ''
    document.getElementById('resourceFiles').innerHTML = ''
    document.getElementById('mimeStats').innerHTML = ''
    document.getElementById('resourceDirectories').appendChild(document.createTextNode('Katalooge: ' + resource_stats.directories.count))
    document.getElementById('resourceFiles').appendChild(document.createTextNode('Faile: ' + resource_stats.files.count + ' / ' + b2s(resource_stats.files.size)))
    Object.keys(resource_stats.mime).forEach(function (mime_type_name) {
        var text_node = document.createTextNode(
            mime_type_name
            + ': ' + op.get(resource_stats, ['mime', mime_type_name, 'count'])
            + ' / ' + b2s(op.get(resource_stats, ['mime', mime_type_name, 'size']))
        )
        var li_node = document.createElement('LI')
        li_node.appendChild(text_node)
        document.getElementById('mimeStats').appendChild(li_node)
    })
}

var recurseLocal = function recurseLocal(parent_resource, paths, loadedCB) {
    // console.log(JSON.stringify(paths, null, 4))
    async.each(paths, function iterator(_path, callback) {
        fs.stat(_path, function(err, stats) {
            if (err) {
                // console.log(err)
                return callback()
            }
            if (stats.isFile()) {
                magic.detectFile(_path, function(err, result) {
                    if (err) {
                        // console.log(err)
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
                // console.log('dir: ' + JSON.stringify(_path, null, 4))
                fs.readdir(_path, function(err, files) {
                    if (err) {
                        return callback(err)
                    }
                    var _paths = files.map(function(file) {
                        var fullpath = path.join(_path, file)
                        // console.log(_path + '+' + file + '=' + fullpath)
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
            document.getElementById('loading').setAttribute('hidden', '')
            document.getElementById('resourceStats').removeAttribute('hidden')
            document.getElementById('selectLocal').removeAttribute('hidden')
            document.getElementById('selectLocalMessage').removeAttribute('hidden')
            break
        case 'loading':
            dom_resource_name.removeAttribute('hidden')
            document.getElementById('loading').removeAttribute('hidden')
            document.getElementById('resourceStats').setAttribute('hidden', '')
            document.getElementById('selectLocal').setAttribute('hidden', '')
            document.getElementById('selectLocalMessage').setAttribute('hidden', '')
            break
    }
}
