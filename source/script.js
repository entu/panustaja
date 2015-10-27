// 1. core modules
var gui     = require('nw.gui')
var util    = require('util')
var fs      = require('fs')
var https   = require('https')
var events  = require('events')
var path    = require('path')


// 2. public modules from npm
// var os      = require('os-utils')


// 3. Own modules
var stringifier   = require('./stringifier.js')
var bytesToSize   = require('./bytesToSize.js')
var msToTime      = require('./msToTime.js')
var loadDirs      = require('./loadDirs.js')
var uploader      = require('./uploader.js')
var progress      = require('./progress.js')
var translate     = require('./translations/estonian.js')


var entu_user_email = ''

var progressStartedCB = function progressStartedCB(metrics) {
    // console.log('progress started', metrics)
    $('#waitspinner').show()
    $('#upload_back').width('100%')
}
var progressIncreasedCB = function progressIncreasedCB(metrics) {
    // console.log('total increased', metrics)
    // $('[progress]').text(bytesToSize(metrics.total))
}
var progressDecreasedCB = function progressDecreasedCB(metrics) {
    // console.log('total decreased', metrics)
    // $('[progress]').text(bytesToSize(metrics.total))
}
var progressAdvancedCB = function progressAdvancedCB(metrics) {
    // console.log('progressAdvancedCB', metrics)
}
var progressOutputCB = function progressOutputCB(metrics) {
    var output_txt = ''
    if (metrics.loading) {
        output_txt = bytesToSize(metrics.total)
                    + '; ' + metrics.last_path
                    + '; ' + metrics.node_count
    } else if (metrics.uploading) {
        output_txt = bytesToSize(metrics.total)
                    + ' - ' + bytesToSize(metrics.current)
                    + ' = ' + bytesToSize(metrics.left)
                    + '; ' + metrics.eta_time
                    + '; ' + metrics.eta_date
        // console.log(metrics)
    } else {
        output_txt = bytesToSize(metrics.total)
    }
    // console.log(output_txt)
    $('[progress]').text(output_txt)
    $('#upload_front').width(metrics.percentage + '%')
}
var progressDoneCB = function progressDoneCB(metrics) {
    // $('#upload_progress').children().empty()
    $('#upload_back').width('0%')
    $('#upload_front').width('0%')
    // console.log('progress done', metrics)
}
progress.register_callbacks(
    progressStartedCB,
    progressIncreasedCB,
    progressDecreasedCB,
    progressAdvancedCB,
    progressOutputCB,
    progressDoneCB
)

// 4. And configuration
var configuration = require('./configuration.json')

// Add os-specific shortcuts and menu
require('./decorate.js').decorate()

global.$ = $

__VERSION = gui.App.manifest.version
ENTU_DNS = 'entu.keeleressursid.ee'
ENTU_URI = 'https://' + ENTU_DNS + '/'
ENTU_API = ENTU_URI + 'api2/'
ENTU_API_ENTITY = ENTU_API + 'entity-'
ENTU_API_EMAIL = ENTU_API + 'email'
ENTU_API_POST_FILE = ENTU_API + 'file'
ENTU_PING = ENTU_API + 'ping/'
ENTU_API_AUTH = ENTU_API + 'user/auth'
ENTU_API_USER = ENTU_API + 'user'


// console.log ( '= ' + gui.App.manifest.name + ' v.' + __VERSION + ' ==================================')

gui.Window.get().focus()

gui.Window.get().on('focus', function() {
})

gui.Window.get()
    .on('resize', function(width, height) {
        $('#card_contents').height($(window).height() - 100)
    })






$( document ).ready(function() {

    // puudub internetiühendus
    require('dns').resolve('www.google.com', function(err) {
      if (err) {
        window.alert ('Netti pole')
        // console.log(err)
        process.exit(1)
      }
    })
    // repositoorium ei vasta
    require('dns').resolve(ENTU_DNS, function(err) {
      if (err)
        {
            // console.log(err)
            window.alert ('Entu pole saadaval')
            process.exit(1)
        }
    })

    $('#overquota_files, #overquota_total').hide()

    $('[translate]')
        .each(function() {
            $(this).html(translate($(this).attr('translate')))
        })
        // Remove tabstop from links in helptexts
        .find('a').attr('tabindex', '-1')

    $('#resource_name')
        .keyup(function(event) {
            loadDirs.root_node().entuname = $('#resource_name').val()
        })

    $('#chdir_button')
        .text('Vali kaust')
        .click(function() {
            // progress.start()
            $('#chdir_input').click()
        })

    $('#chdir_input')
        .change(function(event) {
            $('#waitspinner').show()
            $('#chdir_button').hide()
            // console.log('foo')
            // Now give a tick-or-two for spinner to load
            // because he's too shy to start animation while CPU is intensely engaged
            setTimeout(function() {
                var now_ms = (new Date()).getTime()
                var full_path = $('#chdir_input').val()
                // In nwjs v12 behaviour of directory selecting input form is broken and instead of selected folder it
                // returns recursive list of all files in that folder.
                if (full_path !== full_path.split(';')[0]) {
                    full_path = full_path.split(';')[0]
                    full_path = path.dirname(full_path)
                }
                loadDirs.load(full_path, function finalCallback() {
                    $('#chdir_button').show()
                    $('#waitspinner').hide('slow')
                    $('#resource_name').val(path.basename(full_path))
                    if (Object.keys(loadDirs.nodes()).length > 0) {
                        // console.log(Object.keys(loadDirs.nodes()).length, loadDirs.nodes())
                        var status_message = Object.keys(loadDirs.nodes()).length
                            + ' faili ja kataloogi lugemiseks kulus '
                            + msToTime((new Date()).getTime() - now_ms) + '.'
                        $('[progress]').text(status_message)
                        // console.log(status_message)
                        advanceToNextCard()
                        loadDirs.displayNodes((new Date()).getTime() - now_ms)
                    }
                })
            }, 2)
        })

    $('#back_button')
        .text('Tagasi')
        .click(function() {
            advanceToPrevCard()
            loadDirs.reset()
        })

    $('#login_button')
        .text('Logi sisse')
        .click(function() {
            checkAuth(function(data) {
                ENTU_USER_ID = data.result.id
                ENTU_SESSION_KEY = data.result.session_key
                advanceToNextCard()
                // console.log(data)
                $("a:contains('__USER_EMAIL')").text(data.result.email).prop('href', 'mailto:' + data.result.email)
                $('[progress]').text("Tere, " + data.result.name)
                if (data.result.email === 'mihkel.putrinsh@gmail.com') {
                    require('nw.gui').Window.get().showDevTools()
                }
                // sendFinalEmail([{'Name':'test','Uri':'https://entu.keeleressursid.ee'}])
            })
        })

    $('#upload_button')
        .text('Lae valitud ressursid')
        .click(function() {
            $('#back_button').hide()
            $('#upload_button').hide()
            uploader.createResources(configuration.__ROOT_EID, function uploadCallback(data) {
                // console.log('Uploaded OK') // , data)
                advanceToNextCard()
                $('[progress]').text('Valmis.')
                $('#waitspinner').hide('slow')
                sendFinalEmail(data)
            })
        })

    var meta_path = path.resolve(homePath(), gui.App.manifest.name)
    if (!inoExistsSync(meta_path)) {
        fs.mkdir(meta_path)
    }

    loadCard('hello')

})



var login_frame = $('<IFRAME/>')
    .attr('id', 'login_frame')
    .attr('name', 'login_frame')
    .attr('src', ENTU_API_AUTH)

var auth_in_progress = false
var checkAuth = function checkAuth(successCallback) {
    if (auth_in_progress)
        return
    auth_in_progress = true
    // console.log('Check user from Entu.')
    $.get( ENTU_API_USER )
        .done(function userOk( data ) {
            auth_in_progress = false
            entu_user_email = data.result.email
            window.sessionStorage.setItem('ENTU_USER_ID', data.result.id)
            window.sessionStorage.setItem('ENTU_SESSION_KEY', data.result.session_key)
            successCallback(data)
        })
        .fail(function userFail( data ) {
            if ($('#login_frame').length === 0) {
                $('body').append(login_frame)
                $('#login_frame').fadeIn(500)
                $('#login_frame').load( function() {
                    $.get( ENTU_API_USER )
                        .done(function userOk( data ) {
                            auth_in_progress = false
                            $('#login_frame').detach()
                            entu_user_email = data.result.email
                            window.sessionStorage.setItem('ENTU_USER_ID', data.result.id)
                            window.sessionStorage.setItem('ENTU_SESSION_KEY', data.result.session_key)
                            successCallback(data)
                        })
                })
            }
        })
}
var homePath = function homePath() {
    var home_path = ''
    if (process.env.HOME !== undefined) {
        home_path = process.env.HOME
    } else if (process.env.HOMEPATH !== undefined) {
        home_path = process.env.HOMEDRIVE + process.env.HOMEPATH
    }
    return path.normalize(home_path)
}
var execPath = function execPath() {
    var exec_path = ''
    if (process.PWD !== undefined) {
        exec_path = process.PWD
    } else if (process.execPath !== undefined) {
        exec_path = process.execPath
    }
    return path.dirname(exec_path)
}

var sendFinalEmail = function sendFinalEmail(data) {
    // console.log('Send email notification to submitter.')
    var message_body = []
    data.forEach(function iterateUploadedResources(resource) {
        message_body.push('<li><a href="' + resource.Uri + '">' + resource.Name + '</a></li>')
    })
    message_body = '<ul>' + message_body.join('<br/>') + '</ul>'
    message_body = '<h1>Teie poolt upitatud ressursid</h1>\n\n' + message_body
    var post_data = {
        'to':           entu_user_email,
        'subject':      'Panustajaga upitatud ressursid',
        'message':      message_body,
        'campaign':     'panustaja'
    }
    $.post(ENTU_API_EMAIL, post_data, function(returned_data) {
        // console.log(returned_data)
    })
}

var advanceToNextCard = function advanceToNextCard() {
    $('card').removeClass('current')
    $('.card_title.current').removeClass('current').addClass('complete').next().addClass('current')
    $('#' + $('.card_title.current').attr('translate') ).addClass('current')
}

var advanceToPrevCard = function advanceToPrevCard() {
    $('card').removeClass('current')
    $('.card_title.current').removeClass('current').prev().removeClass('complete').addClass('current')
    $('#' + $('.card_title.current').attr('translate') ).addClass('current')
}

var loadCard = function loadCard(card_name) {
    $('card').removeClass('current')
    $('.card_title.current').removeClass('current')
    var card_id = card_name + '_card'
    var card_label_id = card_name + '_card_label'
    $('#' + card_label_id).addClass('current')
    $('#' + card_id).addClass('current')
}



// fs.existsSync got deprecated and replaced with fs.accessSync in node 1.0.0
var inoExistsSync = function inoExistsSync(path) {
    // console.log('Node version ' + process.versions.node)
    if (process.versions.node.substr(0,2) === '1.') {
        try {
            fs.accessSync(path)
            return true
        } catch(err) {
            return false
        }
    } else {
        return fs.existsSync(path)
    }
}

// catch all kinds of uncatched errors
window.addEventListener('error', function(errEvent){
    var m
    console && console.error(errEvent)
    m = 'uncaughtException: '  +
        errEvent.message + '\nfilename:"' +
        (errEvent.filename ? errEvent.filename : 'app_front.js') +
        '", line:' + errEvent.lineno
    // show any errors early
    document.write('<pre><h2>' +
        m + '</h2><div style="color:white;background-color:red">' +
        errEvent.error.stack + '</div></pre>'
    )
    // window.alert(m)
})

process.on('uncaughtException', function(err){
    // console.error('uncaughtException:', err)
    // console.error(err.stack)
    // window.alert('uncaughtException ' + err)
})
