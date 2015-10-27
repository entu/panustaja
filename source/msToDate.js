

var msToDate = function msToDate(ms, without_time) {
    if (isNaN(ms)) ms = 0
    try {
        d = new Date(ms)
        if (without_time) {
            return d.toISOString().replace(/T/, ' ').replace(/:/g, '-').replace(/\..+/, '').split(' ')[0]
        } else {
            return d.toDateString() + ' ' + d.toTimeString()
        }
    } catch (exception) {
        console.log('Cant convert "' + ms + '" ms.', d)
        throw exception
    }
}

module.exports = msToDate
