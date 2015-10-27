// 1. core modules
var util    = require('util')
var fs      = require('fs')
var path    = require('path')
var gui     = global.window.nwDispatcher.requireNwGui()


// 2. public modules from npm
var moment  = require('moment')


// 3. Own modules
var bytesToSize   = require('./bytesToSize.js')
var msToTime      = require('./msToTime.js')
var progress      = require('./progress.js')
var configuration = require('./configuration.json')
var translate     = require('./translations/estonian.js')



var loadDirs = function loadDirs() {
  var my_nodes = {}
  var root_node = {}
  var rec_counter = 1

  var files_total = 0
  var dirs_total = 0
  var bytes_total = 0
  var overquota_total = 0
  var overquota_files_total = 0

  var decreaseCounter = function decreaseCounter(finalCallback) {
    if (rec_counter === 1) {
      finalCallback()
    } else {
      rec_counter --
    }
  }

  // Decrease this, if statusline doesnot refresh often enough
  var load_factor = 4.1
  var ticker = Math.round((new Date()).getTime() / 1000)
  var nodes_per_sec = 0
  var loadRec = function(parent_node, full_path, finalCallback) {
    if (ticker === Math.round((new Date()).getTime() / 1000)) {
      nodes_per_sec ++
    } else {
      // console.log(ticker + ':' + nodes_per_sec + ' nodes. Active threads: ' + rec_counter)
      $('[progress]').text(nodes_per_sec + '/sec;' + displayNodePath(path.dirname(full_path), path.basename(full_path)))
      ticker = Math.round((new Date()).getTime() / 1000)
      nodes_per_sec = 0
    }
    var wait_ms = Math.round(rec_counter/load_factor)

    setTimeout(function() {
      fs.stat(full_path, function(err, stats) {
        if(stats === undefined) {
          decreaseCounter(finalCallback)
          return
        }
        // console.log('Loading', full_path, finalCallback)
        if (my_nodes[stats.ino] !== undefined) {
          decreaseCounter(finalCallback)
          return
        }

        var new_node = my_nodes[stats.ino] = {
          ino: stats.ino,
          full_path: full_path,
          dirname: path.dirname(full_path),
          basename: path.basename(full_path),
          entuname: path.basename(full_path),
          size: stats.isDirectory() ? 0 : stats.size,
          overquota: (stats.size > configuration.__MAX_FILESIZE_2G ? true : false),
          parent: parent_node,
          is_dir: stats.isDirectory(),
          file_count: 0,
          dir_count: 0,
          nodes: {}
        }

        if (parent_node === null) {
          root_node = new_node
        }

        if (parent_node !== null) {
          parent_node.nodes[stats.ino] = new_node
        }

        // console.log('New node ', Object.keys(my_nodes).length, JSON.stringify({count:rec_counter, path:full_path}))

        if (stats.isDirectory()) {
          if (parent_node !== null) {
            parent_node.dir_count ++
          }
          dirs_total ++
          fs.readdir(full_path, function(err, files) {
            if (files !== undefined) {
              files.forEach(function(childname) {
                if (configuration.__EXCLUDE_FILENAMES.indexOf(childname) === -1) {
                  rec_counter ++
                  loadRec(my_nodes[stats.ino], path.join(full_path, childname), finalCallback)
                }
              })
            }
            decreaseCounter(finalCallback)
          })
        } else if (stats.isFile()) {
          if (parent_node !== null) {
            parent_node.file_count ++
          }
          files_total ++
          bytes_total += stats.size
          decreaseCounter(finalCallback)
        } else {
          decreaseCounter(finalCallback)
        }
      })
    }, wait_ms)
  }

  var displayNodePath = function displayNodePath(dirname_in, basename_in) {
    var dirname = dirname_in
    var basename = basename_in
    var max_length = 40
    var node_path = path.resolve(dirname, basename)
    var diff = node_path.length - max_length
    var half_len = Math.round(max_length / 2)

    // console.log(node_path, node_path.length, diff)
    if (diff > 0) {
      diff += 1
      var basename_intact = false
      var basename_diff = basename.length - half_len
      if (basename_diff > 0) {
        var crop_size = Math.min(diff, basename_diff)
        basename = basename.slice(crop_size)
        diff = diff - crop_size
      } else {
        basename_intact = true
      }
      var dirname_diff = dirname.length - half_len + 1
      if (dirname_diff > 0) {
        var crop_size = Math.min(diff, dirname_diff)
        dirname = dirname.slice(0, dirname.length - crop_size)
      }
      var ret_value = dirname + '…' + basename
      if (basename_intact)
        ret_value = path.resolve(dirname + '…', basename)

      if (ret_value === undefined)
        // console.log(dirname, basename, dirname_in, basename_in)

      $('[progress]').text(ret_value)
      return ret_value
    }
  }

  return {
    bytes_total: function () {
      return bytes_total
    },
    root_node: function () {
      return root_node
    },
    nodes: function () {
      return my_nodes
    },
    load: function (full_path, finalCallback) {
      // console.log(my_nodes, 'Loading', full_path)
      loadRec(null, full_path, finalCallback)
    },
    reset: function () {
      my_nodes = {}
      rec_counter = 1
      output_counter = 0

      files_total = 0
      dirs_total = 0
      bytes_total = 0
      overquota_total = 0
      overquota_files_total = 0

      // console.log(my_nodes, 'Resetting')
      $('#upload_stats').empty()
      $('#overquota_total').empty()
      $('#overquota_files').empty()
      $('[progress]').text('...')
    },
    displayNodes: function (ms_so_far) {
      var now_ms = (new Date()).getTime()
      if (files_total + dirs_total !== Object.keys(my_nodes).length) {
        // console.log('Warning: ' + files_total + ' + ' + dirs_total + ' !== ' + Object.keys(my_nodes).length + '!')
      }
      $('#upload_stats')
        .append($('<div>')
          .append('<label>' + translate('dirs_total') + '</label>')
          .append('<span id="dirs_total">' + dirs_total + '</span>')
          )
        .append($('<div>')
          .append('<label>' + translate('files_total') + '</label>')
          .append('<span id="files_total">' + files_total + '</span>')
          )
        .append($('<div>')
          .append('<label>' + translate('bytes_total') + '</label>')
          .append('<span id=bytes_total>' + bytesToSize(bytes_total) + '</span>')
          )

      var node_keys = Object.keys(my_nodes)
      for (var i = 0; i < node_keys.length; i++) {
        var ino = node_keys[i]
        var current_node = my_nodes[ino]
        // console.log(i, ino)
        if (current_node.overquota) {
          // console.log(current_node.size + ' > ' + configuration.__MAX_FILESIZE_2G)

          bytes_total = bytes_total - current_node.size
          overquota_total = overquota_total + current_node.size
          files_total = files_total - 1
          overquota_files_total = overquota_files_total + 1

          var cn_path = displayNodePath(current_node.dirname, current_node.basename)
          $('#overquota_files').append(
            $('<li class="hoverlink"><a>' + cn_path + '<span class="right">' + bytesToSize(current_node.size) + '</span></a></li>')
              .prop('path', path.resolve(current_node.dirname, current_node.basename))
              .click(function(event) {
                gui.Shell.showItemInFolder($(this).prop('path'))
              })
              .mouseenter(function(event) {
                $('[progress]').text($(this).prop('path'))
              })
              .mouseleave(function(event) {
                $('[progress]').text(
                    (dirs_total + files_total + overquota_files_total)
                    + ' faili ja kataloogi lugemiseks kulus '
                    + msToTime($('#upload_stats').prop('load_time_total')) + '.' )
              })
            )
        }
      }


      $('#bytes_total').text(bytesToSize(bytes_total))
      $('#files_total').text(files_total)
      if ($('#overquota_files').children().size() > 0) {
        $('#overquota_files').show()
        $('#overquota_files').before('<h3>' + overquota_files_total + ' fail' + (overquota_files_total ? 'i' : '') + ' (' + bytesToSize(overquota_total) + ') jääb praegu upitamata</h3>')
        $('#overquota_files').before('<p>' + (overquota_files_total ? 'Nende' : 'Selle') + ' repositooriumisse lisamiseks helista või kirjuta meile.</p>')
      } else {
        $('#overquota_files').hide()
      }

      if (bytes_total > configuration.__UPLOAD_QUOTA_20G) {
        $('#upload_button').hide()
        $('#overquota_total').show()
      } else {
        $('#overquota_total').hide()
        $('#upload_button').show()
      }
      $('#upload_stats')
        .prop('load_time_total', (new Date()).getTime() - now_ms + ms_so_far)
        // .append($('<div>')
        //   .append('<label>' + translate('load_time_total') + '</label>')
        //   .append('<span>' + msToTime((new Date()).getTime() - now_ms + ms_so_far) + '</span>')
        //   )
      $('[progress]').text(
          (dirs_total + files_total + overquota_files_total)
          + ' faili ja kataloogi lugemiseks kulus '
          + msToTime($('#upload_stats').prop('load_time_total')) + '.' )
    }
  }
}



module.exports = loadDirs()
