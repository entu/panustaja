var request = require('request')
var fs = require('fs')
var op = require('object-path')
var path = require('path')
var async = require('async')

const { shell } = require('electron').remote

// var remote = require('remote')
// var dialog = remote.require('dialog')

var b2s = require(path.join(__dirname, '..', 'code', 'bytesToSize.js'))

var resourceRootEid = 4387
var uploadedResourcesProgress
var uploadedFilesProgress
ENTUAPI = 'https://entu.keeleressursid.ee/api2'
ENTUAPIENTITY = 'https://entu.keeleressursid.ee/api2/entity'
ENTUAPIFILE = 'https://entu.keeleressursid.ee/api2/file'

var rendererInterval

var fileUploadTasks = []


function renderProgress() {
    // domResourceStats.removeAttribute('hidden')
    document.getElementById('resourceProgressbarInner').style.width = (uploadedResourcesProgress * 100 / (resourceStats.directories.count + 1)) + '%'
    document.getElementById('uploadedResources').innerHTML = uploadedResourcesProgress
    document.getElementById('fileProgressbarInner').style.width = (uploadedFilesProgress * 100 / resourceStats.files.size) + '%'
    // console.log('== LOGGING: ', uploadedFilesProgress, resourceStats.files.size, resourceStats.files.count)
    document.getElementById('uploadedSize').innerHTML = b2s(uploadedFilesProgress)
}


function addEntuFile(eid, filePath, callback) {

    var options = {
        url: ENTUAPIFILE,
        headers: {
            'X-Auth-UserId': userData.userId,
            'X-Auth-Token': userData.sessionKey,
            'User-Agent': UPLOADERVERSION
        }
    }

    // var req = request.post(options, function (err, resp, body) {
    var req = request.post(options, function (err) {
        // console.log(err, resp, JSON.parse(body))
        if (err) {
            callback(err)
        // } else if (resp.status.statusCode !== 200) { callback(body) }
        } else {
            // console.log('URL: ' + body)
            callback()
        }
    })


    var form = req.form()
    var readStream = fs.createReadStream(filePath)
    form.append('file', readStream)
    form.append('entity', eid)
    form.append('property', 'resource-file')
    form.append('filename', path.basename(filePath))
    readStream.on('data', function(chunk) {
        uploadedFilesProgress += chunk.length
        // console.log('Uploaded: ' + uploadedFilesProgress + '(+' + chunk.length + ')')
    })
}

function addEntuProperties(eid, data, callback) {

    request.put({
        url: preparedUrl,
        headers: headers,
        body: qb,
        strictSSL: true,
        json: true,
        timeout: 60000
    }, function(error, response, body) {
        if(error) return callback(error)
        if(response.statusCode !== 201 || !body.result) return callback(new Error(op.get(body, 'error', body)))

        callback(null, op.get(body, 'result.properties.' + property + '.0', null))
    })

    var urlData = Object.keys(data).map(function (ix) {return ix + '=' + data[ix]}).join('&')
    // console.log(urlData)
    var xhr = new window.XMLHttpRequest()
    xhr.open('PUT', ENTUAPIENTITY + '-' + eid + '?' + urlData, true)
    xhr.setRequestHeader('X-Auth-UserId', userData.userId)
    xhr.setRequestHeader('X-Auth-Token', userData.sessionKey)
    xhr.onload = function () {
        // var response = JSON.parse(this.responseText)
        // console.log(JSON.stringify({sent:data, got:response}, null, 4))
        callback()
    }
    xhr.onerror = function(err) {
        callback('ERROR: ' + err)
    }
    xhr.send(data)
}

function createEntuResource(parentEid, resource, callback) {
    // console.log('create under EID:', parentEid)

    var body = {
        'definition': 'resource',
        'resource-name': path.basename(op.get(resource, ['name'], 'nameless resource')),
        'resource-uploader-version': UPLOADERVERSION
    }
    if (op.get(resource, ['mime-encode'], false)) {
        op.set(body, ['resource-mime-encode'], op.get(resource, ['mime-encode']))
    }
    if (op.get(resource, ['size'], false)) {
        op.set(body, ['resource-size'], op.get(resource, ['size']))
    }

    var preparedUrl = ENTUAPIENTITY + '-' + parentEid
    var headers = {'X-Auth-UserId': userData.userId, 'X-Auth-Token': userData.sessionKey}

    // console.log('Try to execute URL ' + preparedUrl, userData, body)
    request.post({
        url: preparedUrl,
        headers: headers,
        body: body,
        strictSSL: true,
        json: true,
        timeout: 60000
    }, function(error, response, body) {
        // console.log('result', body)
        if(error) return callback(error)
        if(response.statusCode !== 201) return callback(new Error(op.get(body, 'error', body)))

        var newEid = body.result.id
        uploadedResourcesProgress++
        op.get(resource, ['files'], []).forEach(function(filePath) {
            fileUploadTasks.push(function uploadFile(callback) {
                document.getElementById('status').innerHTML = newEid + ' : ' + filePath
                // console.log('F: Uploading file ' + filePath + ' at resource ' + newEid)
                addEntuFile(newEid, filePath, function fileAddedCB() {
                    callback()
                })
            })
            // console.log('F: Queued file ' + filePath + ' for upload at resource ' + newEid)
        })

        callback(null, newEid)
    })
}

function recurseResources(parentEid, resource, resourcesCreatedCB) {
    // console.log('Recurse under EID:', parentEid)
    createEntuResource(parentEid, resource, function resourceCreatedCB(err, newEid) {
        if (err) { return resourcesCreatedCB(err) }
        async.each(op.get(resource, ['resources'], []), function iterator(childResource, callback) {
            recurseResources(newEid, childResource, callback)
        }, function(err){
            if( err ) { return resourcesCreatedCB(err) }
            // console.log('Created:', newEid)
            resourcesCreatedCB(null, newEid)
        })
    })
}

function upload() {
    op.set(resource, ['size'], b2s(resourceStats.files.size))
    op.set(resource, ['mime-encode'], JSON.stringify(resourceStats.mime, null, 4))

    uploadedResourcesProgress = 0
    uploadedFilesProgress = 0
    // console.log(JSON.stringify(resource, null, 4))
    document.getElementById('uploadTotalResources').innerHTML = (resourceStats.directories.count + 1)
    document.getElementById('uploadTotalSize').innerHTML = b2s(resourceStats.files.size)
    rendererInterval = setInterval(function () {
        renderProgress()
    }, 250)
    setFormState('uploading')
    async.waterfall([
        function runRecurseResources(callback) {
            recurseResources(resourceRootEid, resource, function resourcesCreated(err, newEid) {
                if (err) { return callback(err) }
                callback(null, newEid)
            })
        },
        function runFileUploadTasks(newEid, callback) {
            async.parallelLimit(fileUploadTasks, 3, function filesUploaded() { callback(null, newEid) })
        },
        function updateUI(newEid, callback) {
            setFormState('uploaded')
            document.getElementById('resourceEntuLink').setAttribute('href', 'https://entu.keeleressursid.ee/entity/resource/' + newEid)
            document.getElementById('resourceEntuLink').innerHTML = 'https://entu.keeleressursid.ee/entity/resource/' + newEid
            document.getElementById('resourceEntuLink').onclick = function openResourceInBrowser() {
                shell.openExternal('https://entu.keeleressursid.ee/entity/resource/' + newEid)
                return false
            }
            // ipc.send('data', resource)
            clearInterval(rendererInterval)
            renderProgress()
        }
    ], function(err) {
        if (err) { return err }
    })
}



module.exports.upload = upload
