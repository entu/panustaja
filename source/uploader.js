// 1. core modules
var util    = require('util')
var fs      = require('fs')
var https   = require('https')
var events  = require('events')
var path    = require('path')
var gui     = global.window.nwDispatcher.requireNwGui()


// 2. public modules from npm
// var os      = require('os-utils')


// 3. Own modules
var stringifier   = require('./stringifier.js')
var bytesToSize   = require('./bytesToSize.js')
var msToTime      = require('./msToTime.js')
var loadDirs      = require('./loadDirs.js')
var progress      = require('./progress.js')
var translate     = require('./translations/estonian.js')


// 4. And configuration
var configuration = require('./configuration.json')


ENTU_DNS = 'entu.keeleressursid.ee'
ENTU_URI = 'https://' + ENTU_DNS + '/'
ENTU_API = ENTU_URI + 'api2/'
ENTU_API_ENTITY = ENTU_API + 'entity-'
ENTU_API_POST_FILE = ENTU_API + 'file'


var uploaded_resources = []

var uploader = function uploader() {

    var upload_processes = 0
    var createResourcesRec = function createResourcesRec(parent_eid, current_node, finalCallback) {
        progress.setLastPath(current_node.basename)
        // window.alert('createResourcesRec: ' + parent_eid + ', ' + current_node.full_path + ', ' + current_node.basename)
        if (current_node.is_dir) {
            // window.alert('Calling postNewDir')
            postNewDir(parent_eid, current_node, function callback(eid) {
                var node_keys = Object.keys(current_node.nodes)
                upload_processes += node_keys.length
                for (var i = 0; i < node_keys.length; i++) {
                    var child_ino = node_keys[i]
                    var child_node = current_node.nodes[child_ino]
                    createResourcesRec(eid, child_node, finalCallback)
                }
                if (upload_processes === 0) {
                    finalCallback(uploaded_resources)
                } else {
                    upload_processes --
                    // console.log(upload_processes + ': Last dir was: ' + current_node.entuname)
                }
            })
        } else {
            // window.alert('Calling postNewFile')
            postNewFile(parent_eid, current_node, function callback() {
                if (upload_processes === 0) {
                    finalCallback(uploaded_resources)
                } else {
                    upload_processes --
                    // console.log(upload_processes + ': Last file was: ' + current_node.entuname)
                }
            })
        }
    }

    return {
        createResources: function(root_eid, finalCallback) {
            // console.log(root_eid)
            progress.increase(loadDirs.bytes_total())
            progress.start()
            createResourcesRec(root_eid, loadDirs.root_node(), finalCallback)
        }
    }
}




var postNewFile = function postNewFile(parent_eid, current_node, callback) {
    // console.log('new File: ' + parent_eid + ', ' + current_node.full_path + ', ' + current_node.basename)
    // window.alert('new File: ' + parent_eid + ', ' + current_node.full_path + ', ' + current_node.basename)
    // return
    var f = new window.File(current_node.full_path, current_node.basename)
    // console.log('newFile', f)
    var filesize = current_node.size

    // window.alert('Creating formData')
    var formData = new window.FormData()
    // console.log('Creating formData', 'entity', parent_eid)
    formData.append('entity', parent_eid)
    // window.alert('Creating formData property resource-file')
    formData.append('property', 'resource-file')
    // window.alert('Creating formData filename')
    formData.append('filename', current_node.basename)
    // window.alert('Creating formData file')
    formData.append('file', f)
    // window.alert('Created formData')

    var last_position = 0
    var xhr = new window.XMLHttpRequest()
    xhr.upload.onprogress = function (ev) {
        if (ev.lengthComputable) {
            // console.log(current_node.full_path, ev)
            var new_position = Math.round(ev.position / ev.total * filesize)
            // console.log('advancing to ' + new_position + ' from ' + last_position)
            progress.advance(new_position - last_position)
            last_position = new_position
        }
    }
    // window.alert('Registered upload.onprogress')
    // window.alert('Opening xhr POST')
    xhr.open('POST', ENTU_API_POST_FILE, true)
    // window.alert('Setting headers')
    xhr.setRequestHeader('X-Auth-UserId', window.sessionStorage.getItem('ENTU_USER_ID'))
    xhr.setRequestHeader('X-Auth-Token', window.sessionStorage.getItem('ENTU_SESSION_KEY'))
    // window.alert('Sending formData')
    xhr.send(formData)
    // window.alert('Sent formData')
    // console.log(xhr.upload)
    // window.alert('Sent formData')
    xhr.onreadystatechange = function() {
        // console.log(current_node.full_path, xhr.readyState, xhr.status)
        if (xhr.readyState === 4 && xhr.status === 200) {
            callback()
        }
    }
    // window.alert('Registered onreadystatechange')
}


var postNewDir = function postNewDir(parent_eid, current_node, callback) {
    var post_data = {'definition': 'resource'}
    $.post(ENTU_API_ENTITY + parent_eid, post_data, function(returned_data) {
        var returned_eid = returned_data.result.id
        // window.alert('Created resource: ', current_node, ' under ', parent_eid, '. New eid: ' + returned_eid)

        $.ajax({
            url: ENTU_API_ENTITY + returned_eid,
            type: 'PUT',
            // headers: {
            //     'X-Auth-UserId': window.sessionStorage.getItem('ENTU_USER_ID'),
            //     'X-Auth-Token': window.sessionStorage.getItem('ENTU_SESSION_KEY')
            // },
            data: {
                'resource-name' : current_node.entuname,
                'resource-uploader-version': (gui.App.manifest.name + ' ' + gui.App.manifest.version)
            }
        })
        .done(function( data ) {
            // console.log( data )
            var resource_name = data.result.properties['resource-name'][0].value
            var resource_link = $('<li id="' + current_node.ino + '" class="hoverlink">' + resource_name + '</li>')
            $('#uploaded_resource_list').show()
            $('#uploaded_resource_list').append(resource_link)
            var resource_uri = ENTU_URI + 'entity/resource/' + returned_eid
            uploaded_resources.push({'Name':resource_name, 'Uri':resource_uri})
            resource_link
                .attr('eid', returned_eid)
                .click( function clickEntuNode() {
                    gui.Shell.openExternal(resource_uri)
                })
            callback(returned_eid)
        })
        .fail(function( jqXHR, textStatus, error ) {
            // console.log(util.inspect(error))
            window.alert( 'Upload failed: ' + textStatus )
        })

    })
    .fail(function( jqXHR, textStatus, error ) {
        // console.log(util.inspect(error))
        // console.log( 'Request failed: ' + textStatus + '; retry in 500.', parent_eid, current_node )
        setTimeout(function retryPostNewDir () {
            postNewDir(parent_eid, current_node, callback)
        }, 500)
    })
}


module.exports = uploader()
