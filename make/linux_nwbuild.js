var NwBuilder = require('node-webkit-builder')
var nw = new NwBuilder({
    files: [
        '../node_modules/**',
        '../source/**',
        '../package.json'
        ], // use the glob format
    // platforms: ['osx64'],
    platforms: ['linux'],
    buildDir: '../bin',
    cacheDir: '../../../nwbuilder/cache',
    version: '0.8.6',
    macZip: true,
    appVersion: true,
    macIcns: '../EKRK/uploader/source/images/murakas.icns'
})

//Log stuff you want

nw.on('log',  console.log)

// Build returns a promise
nw.build().then(function () {
   console.log('all done!')
}).catch(function (error) {
    console.error(error)
})
