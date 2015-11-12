var request = require('request')
var fs = require('fs')
var op = require('object-path')
var path = require('path')
var async = require('async')

// var remote = require('remote')
// var dialog = remote.require('dialog')

var b2s = require(path.join(__dirname, '..', 'code', 'bytesToSize.js'))

var resource_root_eid = 4387
var i = 0
var uploaded_resources_progress
var uploaded_files_progress
ENTU_API_ENTITY = 'https://entu.keeleressursid.ee/api2/entity'
ENTU_API_FILE = 'https://entu.keeleressursid.ee/api2/file'

var upload = function upload() {
    op.set(resource, ['name'], document.getElementById('resourceNameInput').value)

    uploaded_resources_progress = 0
    uploaded_files_progress = 0
    console.log(JSON.stringify(resource, null, 4))
    document.getElementById('uploadTotalResources').innerHTML = (resource_stats.directories.count + 1)
    document.getElementById('uploadTotalSize').innerHTML = b2s(resource_stats.files.size)
    renderer_interval = setInterval(function () {
        renderProgress()
    }, 250)
    setFormState('uploading')
    recurseResources(resource_root_eid, resource, resourcesCreated)
}

var resourcesCreated = function resourcesCreated(err) {
    if (err) { throw(err) }
    async.parallelLimit(file_upload_tasks, 3, function filesUploaded() {
        setFormState('uploaded')
        document.getElementById('resource_entu_link').setAttribute('href', 'https://entu.keeleressursid.ee/entity/resource/' + resource.eid)
        document.getElementById('resource_entu_link').onclick = openResourceInBrowser
        // ipc.send('data', resource)
        clearInterval(renderer_interval)
        renderProgress()
    })
}

var recurseResources = function recurseResources(parent_eid, resource, resourcesCreatedCB) {
    console.log('Recurse under EID:', parent_eid)
    createEntuResource(parent_eid, resource, function resourceCreatedCB(err, new_eid) {
        if (err) { return resourcesCreatedCB(err) }
        async.each(op.get(resource, ['resources'], []), function iterator(child_resource, callback) {
            recurseResources(new_eid, child_resource, callback)
        }, function(err){
            if( err ) { return resourcesCreatedCB(err) }
            resourcesCreatedCB()
        })
    })
}


var openResourceInBrowser = function openResourceInBrowser() {
    require('shell').openExternal('https://entu.keeleressursid.ee/entity/resource/' + resource.eid)
    return false
}

var renderProgress = function renderProgress() {
    // dom_resource_stats.removeAttribute('hidden')
    document.getElementById('resourceProgressbarInner').style.width = (uploaded_resources_progress * 100 / (resource_stats.directories.count + 1)) + '%'
    document.getElementById('uploadedResources').innerHTML = uploaded_resources_progress
    document.getElementById('fileProgressbarInner').style.width = (uploaded_files_progress * 100 / resource_stats.files.size) + '%'
    // console.log('== LOGGING: ', uploaded_files_progress, resource_stats.files.size, resource_stats.files.count)
    document.getElementById('uploadedSize').innerHTML = b2s(uploaded_files_progress)
}




var file_upload_tasks = []


var createEntuResource = function createEntuResource(parent_eid, resource, callback) {
    console.log('create under EID:', parent_eid)
    var xhr = new window.XMLHttpRequest()
    xhr.open('POST', ENTU_API_ENTITY + '-' + parent_eid, true)
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded")
    xhr.setRequestHeader('X-Auth-UserId', user_data['user_id'])
    xhr.setRequestHeader('X-Auth-Token', user_data['session_key'])
    xhr.onload = function (err) {
        if (err) { return callback(err) }
        var new_eid = op.get(JSON.parse(this.responseText), ['result', 'id'], false)
        console.log('Looking for new EID:', new_eid)
        if (new_eid) {
            console.log('onload new EID:', new_eid)
            op.set(resource, ['eid'], new_eid)
            addEntuProperties(new_eid, {
                "resource-name": path.basename(op.get(resource, ['name'], 'nameless resource')),
                "resource-uploader-version": UPLOADER_VERSION
            }, function(err) {
                if (err) { return callback(err) }
                uploaded_resources_progress++
                op.get(resource, ['files'], []).forEach(function(file_path) {
                    file_upload_tasks.push(function uploadFile(callback) {
                        document.getElementById('status').innerHTML = new_eid + ' : ' + file_path
                        // console.log('F: Uploading file ' + file_path + ' at resource ' + new_eid)
                        addEntuFile(new_eid, file_path, function fileAddedCB() {
                            callback()
                        })
                    })
                    // console.log('F: Queued file ' + file_path + ' for upload at resource ' + new_eid)
                })
                callback(null, new_eid)
            })
        } else {
            callback('ERROR: ', this.responseText)
        }
    }
    xhr.onerror = function(err) {
        console.log('error:', err)
        callback(err)
    }
    xhr.send('definition=resource')
}


var addEntuFile = function addEntuFile(eid, file_path, callback) {

    var options = {
        url: ENTU_API_FILE,
        headers: {
            'X-Auth-UserId': user_data['user_id'],
            'X-Auth-Token': user_data['session_key'],
            'User-Agent': UPLOADER_VERSION
        }
    }

    var req = request.post(options, function (err, resp, body) {
        // console.log(err, resp, JSON.parse(body))
        if (err) {
            callback(err)
        // } else if (resp.status.statusCode !== 200) {
        //     callback(body)
        } else {
            // console.log('URL: ' + body)
            callback()
        }
    })


    var form = req.form()
    var read_stream = fs.createReadStream(file_path)
    form.append('file', read_stream)
    form.append('entity', eid)
    form.append('property', 'resource-file')
    form.append('filename', path.basename(file_path))
    read_stream.on('data', function(chunk) {
        uploaded_files_progress += chunk.length
        console.log("Uploaded: " + uploaded_files_progress + '(+' + chunk.length + ')')
    })
}

var addEntuProperties = function addEntuProperties(eid, data, callback) {
    var url_data = Object.keys(data).map(function (ix) {return ix + '=' + data[ix]}).join('&')
    // console.log(url_data)
    var xhr = new window.XMLHttpRequest()
    xhr.open('PUT', ENTU_API_ENTITY + '-' + eid + '?' + url_data, true)
    xhr.setRequestHeader('X-Auth-UserId', user_data['user_id'])
    xhr.setRequestHeader('X-Auth-Token', user_data['session_key'])
    xhr.onload = function () {
        var response = JSON.parse(this.responseText)
        // console.log(JSON.stringify({sent:data, got:response}, null, 4))
        callback()
    }
    xhr.onerror = function(err) {
        callback('ERROR: ' + err)
    }
    xhr.send(data)
}

module.exports.upload = upload
