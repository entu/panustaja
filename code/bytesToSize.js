function bytesToSize(bytes) {
    if (bytes === undefined) { bytes = 0 }
    var sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) { return '0 B' }
    try {
        var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10)
        var decimals = Math.max(0, i-1)
        return (bytes / Math.pow(1024, i)).toFixed(decimals) + ' ' + sizes[i]
    } catch (exception) {
        console.log('Cant convert "' + bytes + '" bytes.')
    }
}

module.exports = bytesToSize
