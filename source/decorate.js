var gui = window.require('nw.gui')

module.exports.decorate = function decorate() {
  var win = gui.Window.get()
  var nativeMenuBar = new gui.Menu({ type: "menubar" })
  try {
    nativeMenuBar.createMacBuiltin(gui.App.manifest.name + ' ' + gui.App.manifest.version, {
      // hideEdit: true,
      hideWindow: true
    })
    nativeMenuBar.items[0].label = 'Panustaja'
    win.menu = nativeMenuBar
    win.menu.items[0].icon = 'source/images/pixel.png'
    win.menu.items[0].submenu.items[0].icon = 'source/images/minimura.png'
    win.menu.items[0].submenu.items[0].label = 'Panustajast...'

  } catch (ex) {
    console.log(ex.message)
  }
}