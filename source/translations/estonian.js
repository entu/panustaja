var marked  = require('marked')
var fs      = require('fs')
var bytesToSize  = require('../bytesToSize.js')

configuration = require('../configuration.json')
configuration['__UPLOAD_QUOTA_H'] = bytesToSize(configuration['__UPLOAD_QUOTA_20G'])
configuration['__MAX_FILESIZE_H'] = bytesToSize(configuration['__MAX_FILESIZE_2G'])


var translations =
{
    "resource_name": "**Ressursi nimi**",
    "hello_card": "Sisselogimine",
    "select_card": "Ressursi valimine",
    "upload_card": "Upitamine",
    "thankyou_card": "Tänusõnad",
    "login_button": "Logi sisse",
    "upload_button": "Lae ressurss üles",
    "back_button": "Tagasi",
    "overquota_total": "Ressursi kogumaht ületab seatud piirangut {{__UPLOAD_QUOTA_H}}.",
    "loaded": "Loetud on {{files}} faili {{folders}} kaustas.",
    "dirs_total": "Kaustu",
    "files_total": "Faile",
    "bytes_total": "Maht",
    "load_time_total": "Aeg",
    "uploaded_resource_list": "**Upitatud ressursid**"
}

var tr_dir = './source/translations/estonian/'

fs.readdirSync(tr_dir).forEach(function scanHome(filename) {
    if (filename.substr(-3) === '.md') {
        translations[filename.slice(0,-3)] = fs.readFileSync(tr_dir + filename).toString()
        // console.log(filename, translations[filename.slice(0,-3)])
    }
})


// replace_array is optional array for replacing placeholders
//    [{s:"search string", r:"replace_string"}]
var translate = function translate(key, replace_array) {
    // console.log(key)
    if (translations[key] === undefined) return '**(--' + key + '--)**'
    var return_string = translations[key]
    if (replace_array !== undefined) {
        replace_array.forEach(function replacePlaceholders(data) {
            return_string = return_string.replace('{{' + data.s + '}}', data.r)
        })
    }
    for (var c_key in configuration) {
        return_string = return_string.replace('{{' + c_key + '}}', configuration[c_key])
    }
    return marked(return_string)
}

module.exports = translate
