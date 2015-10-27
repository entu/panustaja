

var msToTime = function msToTime(interval) {

    if (isNaN(interval)) interval = 0
    if (interval < 1000) return '0 sekundit'


    var ms    = interval % 1000
    interval  = (interval - ms) / 1000
    var secs  = interval % 60
    interval  = (interval - secs) / 60
    var mins  = interval % 60
    interval  = (interval - mins) / 60
    var hrs   = interval % 24
    interval  = (interval - hrs) / 24
    var days  = interval % 7
    var weeks = (interval - days) / 7

    var human_interval = []

    if (weeks > 0) {
        human_interval.push(weeks + ' nädal' + (weeks > 1 ? 'at' : ''))
    }
    if (days > 0) {
        human_interval.push(days + ' päev' + (days > 1 ? 'a' : ''))
    }
    if (hrs > 0) {
        human_interval.push(hrs + ' tund' + (hrs > 1 ? 'i' : ''))
    }
    if (mins > 0) {
        human_interval.push(mins + ' minut' + (mins > 1 ? 'it' : ''))
    }
    if (secs > 0) {
        human_interval.push(secs + ' sekund' + (secs > 1 ? 'it' : ''))
    }

    return human_interval.join(' ')
}

module.exports = msToTime
