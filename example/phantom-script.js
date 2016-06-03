var page = require("webpage").create()
page.onConsoleMessage = function(msg) {
  console.log(msg)
  if (msg == "DONE") phantom.exit()
}
page.open("http://0:8080")
