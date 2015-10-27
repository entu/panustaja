var msToTime  = require('./msToTime.js')
var msToDate  = require('./msToDate.js')

var metrics
var CB = {}


var progress = function progress() {

    var initMetrics = function initMetrics() {
        metrics = {
            total:              0,
            current:            0,
            left:               0,
            start_time_ms:      undefined,      // timestamp
            advance_time_ms:    undefined,      // timestamp of last advance
            elapsed_ms:         0,              // advance_time_ms - start_time_ms
            eta_ms:             0,              // ms, estimated time left
            eta_time:           '',             // humanize(eta_ms)
            eta_date:           '',
            counter:            0,
            percentage:         0,
            last_path:          'N/A',
            registered:         false,
            started:            false,
            loading:            false,
            uploading:          false,
            last_refresh_ms:    0,              // timestamp of last refresh
            last_amount:        0,              // amount of data between last two refreshes
            last_interval_ms:   0,              // interval between last two refreshes
            mov_ave_pool_ms:    100000,         // length of moving average calculation pool
            mov_ave_pool_bytes: 0,              // moving average of bytes transferred in last mov_ave_pool_ms
            mov_ave_speed:      0,              // bytes/ms, mov_ave_pool_bytes / min(elapsed_ms, mov_ave_pool_ms)
            done:               false
        }
    }
    initMetrics()

    var refresh_interval_target = 1000
    var refresh_interval = refresh_interval_target
    var refresh = function refresh() {
        if (!metrics.started)
            return
        // console.log(metrics)

        var d = new Date()
        var now_ms = d.getTime()

        if (metrics.last_refresh_ms === 0)
            metrics.last_refresh_ms = now_ms

        metrics.last_interval_ms = now_ms - metrics.last_refresh_ms
        if (metrics.last_interval_ms > refresh_interval_target) {
            refresh_interval--
        } else if (metrics.last_interval_ms < refresh_interval_target) {
            refresh_interval++
        }

        if (metrics.elapsed_ms > metrics.mov_ave_pool_ms) {
            metrics.mov_ave_pool_bytes -= Math.round(metrics.mov_ave_pool_bytes * metrics.last_interval_ms / metrics.mov_ave_pool_ms)
        }
        metrics.mov_ave_pool_bytes += metrics.last_amount
        metrics.mov_ave_speed = Math.round( metrics.mov_ave_pool_bytes / Math.min(metrics.elapsed_ms, metrics.mov_ave_pool_ms) )

        metrics.eta_ms = metrics.left / metrics.mov_ave_speed
        metrics.eta_time = msToTime(metrics.eta_ms)
        metrics.eta_date = msToDate(metrics.advance_time_ms + metrics.eta_ms)

        metrics.percentage = metrics.current / metrics.total * 100
        if (metrics.left <= 0) {
            metrics.done = true
        }
        if (metrics.left < 0) {
            // console.log('Metrics inconsistent', metrics)
        }

        metrics.last_amount = 0
        metrics.last_refresh_ms = now_ms
    }

    return {
        metrics: metrics,
        register_callbacks: function(started_cb, increased_cb, decreased_cb, advanced_cb, output_cb, done_cb) {
            CB['started_cb'] = started_cb
            CB['increased_cb'] = increased_cb
            CB['decreased_cb'] = decreased_cb
            CB['advanced_cb'] = advanced_cb
            CB['output_cb'] = output_cb
            CB['done_cb'] = done_cb
            metrics.registered = true
            CB.output_cb(metrics)
            return metrics
        },
        start: function() {
            if (!metrics.registered) throw "Callbacks not registered!"
            if (metrics.started) throw "Allready started!"

            var d = new Date()
            metrics.start_time_ms = metrics.advance_time_ms = d.getTime()
            metrics.started = true
            CB.started_cb(metrics)

            var output_rec = function output_rec () {
                if (!metrics.done) {
                    refresh()
                    CB.output_cb(metrics)
                    // console.log(metrics + ' | Next output in ' + refresh_interval + ' ms.')
                    setTimeout(function() {output_rec()}, refresh_interval)
                }
            }
            // var output_rec = function output_rec () {
            //     if (!metrics.done) {
            //         if (metrics.started) {
            //             CB.output_cb(metrics)
            //         } else {
            //             metrics.started = true
            //             CB.started_cb(metrics)
            //         }
            //     }
            // }
            output_rec()
        },



        restart: function() {
            if (!metrics.registered) throw "Callbacks not registered!"
            initMetrics()
            var d = new Date()
            metrics.start_time_ms = metrics.advance_time_ms = d.getTime()
            metrics.started = true
            CB.started_cb(metrics)
        },
        increase: function(amount) {
            if (!metrics.registered) throw "Callbacks not registered!"

            metrics.loading = true
            // console.log(metrics, amount)
            amount = Number(amount)
            metrics.total += amount
            // console.log(metrics, amount)
            metrics.left += amount
            CB.increased_cb(metrics)
        },
        decrease: function(amount) {
            if (!metrics.registered) throw "Callbacks not registered!"

            amount = Number(amount)
            metrics.total -= amount
            metrics.left -= amount
            // if (isNaN(metrics.left))
            //     console.log(metrics.last_amount, metrics)
            CB.decreased_cb(metrics)
        },
        advance: function(amount) {
            if (!metrics.registered) throw "Callbacks not registered!"

            metrics.loading = false
            metrics.uploading = true
            var d = new Date()
            if (!metrics.started) {
                this.start()
            }

            if (amount === undefined) {
                amount = 0
            }

            metrics.current += amount
            metrics.left -= amount
            metrics.advance_time_ms = d.getTime()
            metrics.elapsed_ms = metrics.advance_time_ms - metrics.start_time_ms

            metrics.last_amount += Number(amount)

            CB.advanced_cb(metrics)
            if (metrics.done)
                CB.done_cb(metrics)
        },
        setLastPath: function(path) {
            metrics.last_path = path
        }
    }
}

module.exports = progress()