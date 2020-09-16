const querystring = require('querystring')
const https = require('https')
const FormData = require('form-data')
const fs = require('fs')
const op = require('object-path')
const path = require('path')
const async = require('async')

const { shell } = require('electron').remote

const b2s = require(path.join(__dirname, '..', 'code', 'bytesToSize.js'))

const resourceRootEid = 4387
const ENTUHOSTNAME = 'entu.keeleressursid.ee'
const ENTITYAPIPATHNAME = '/api2/entity'
const FILEAPIPATHNAME = '/api2/file'

var uploadedResourcesProgress
var uploadedFilesProgress
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


function addEntuFile(eid, filePath, resource, callback) {
    // console.log('U: Uploading file ' + filePath + ' at resource ' + eid)

    const headers = {
        'X-Auth-UserId': userData.userId,
        'X-Auth-Token': userData.sessionKey,
        'User-Agent': UPLOADERVERSION,
        'X-FILENAME': path.basename(filePath),
        'X-ENTITY': eid,
        'X-PROPERTY': 'resource-file'
    }

    const readStream = fs.createReadStream(filePath)
    readStream.on('data', function(chunk) {
        uploadedFilesProgress += chunk.length
    })
    readStream.on('end', function () {
        // console.log('finished stream', req)
        req.end()
    })

    const form = new FormData()
    form.append('entity', eid)
    form.append('property', 'resource-file')
    form.append('filename', path.basename(filePath))
    form.append('file', readStream)
    // console.log('form with entity', eid, form)
    
    let options = {
        hostname: ENTUHOSTNAME,
        path: FILEAPIPATHNAME,
        method: 'POST',
        headers: headers
    }
    
    const req = https.request(options, response => {
        // console.log('Status', response.statusCode)
        // if (response.statusCode !== 201) {
        //     return callback(new Error(op.get(postData, 'error', postData)))
        // }
        let body = ''
        response.setEncoding('utf8')
        response.on('data', (chunk) => { body = body + chunk })
        response.on('end', () => {
            body = JSON.parse(body)
            // console.log('Response body', body)
        })    
        callback()
    })
    req.on('error', (e) => { return callback(e) })

    form.pipe(req)
    postData = querystring.stringify({'entity': eid})
    req.write(postData)
    // req.end()
}


function createEntuResource(parentEid, resource, callback) {
    // console.log('create under EID:', parentEid)
    // console.log('resource::', op.get(resource))

    let postData = {
        'definition': 'resource',
        'resource-name': path.basename(op.get(resource, ['name'], 'nameless resource')),
        'resource-uploader-version': UPLOADERVERSION
    }
    if (op.get(resource, ['mime-encode'], false)) {
        op.set(postData, ['resource-mime-encode'], op.get(resource, ['mime-encode']))
    }
    if (op.get(resource, ['size'], false)) {
        op.set(postData, ['resource-size'], op.get(resource, ['size']))
    }
    postData = querystring.stringify(postData)

    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length,
        'X-Auth-UserId': userData.userId,
        'X-Auth-Token': userData.sessionKey
    }

    const options = {
        hostname: ENTUHOSTNAME,
        path: ENTITYAPIPATHNAME + '-' + parentEid,
        method: 'POST',
        headers: headers
    }
    // console.log('Request with options ', options)

    const req = https.request(options, (res) => {
        // console.log('RES:', res)
        // console.log('HEADERS:' ${JSON.stringify(res.headers)}`)
        if (res.statusCode !== 201) {
            return callback(new Error(op.get(postData, 'error', postData)))
        }
        let body = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => { body = body + chunk })
        res.on('end', () => {
            body = JSON.parse(body)
            // console.log('Response body', body)

            var newEid = body.result.id
            uploadedResourcesProgress++
            op.get(resource, ['files'], []).forEach(function(filePath) {
                fileUploadTasks.push(function uploadFile(callback) {
                    document.getElementById('status').innerHTML = newEid + ' : ' + filePath
                    // console.log('F: Uploading file ' + filePath + ' at resource ' + newEid)
                    addEntuFile(newEid, filePath, resource, function fileAddedCB() {
                        callback()
                    })
                })
                // console.log('F: Queued file ' + filePath + ' for upload at resource ' + newEid)
            })
            callback(null, newEid)
        })
    })
    req.on('error', (e) => { return callback(e) })

    req.write(postData)
    req.end()
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
                // console.log('resources created; eid', newEid)
                callback(null, newEid)
            })
        },
        function runFileUploadTasks(newEid, callback) {
                // console.log('runFileUploadTasks; eid', newEid)
                async.parallelLimit(fileUploadTasks, 1, function filesUploaded() { callback(null, newEid) })
        },
        function updateUI(newEid, callback) {
            // console.log('set form state uploaded; eid', newEid)
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
