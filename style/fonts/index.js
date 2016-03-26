var Fontmin = require("fontmin")
var fontmin = new Fontmin
fontmin
  .src("CourierPrimeSans-master/ttf/*.ttf")
  .dest("/result")
  .use(Fontmin.glyph({
    text: (
      "abcdefghijklmnopqrstuvwxyz" +
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
        "0123456789" +
        "()[]{}<>" +
        ".,?!:;" +
        " -=+@%&^*" +
        "\"'"
    )
  }))
  .use(Fontmin.ttf2woff())
  .run(function(err, files) {
    if (err) throw err
  })
