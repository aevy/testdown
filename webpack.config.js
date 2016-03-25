var webpack = require("webpack")
var html = require("html-webpack-plugin")
module.exports = [
  {
    name: "test",
    target: "web",
    devtool: "inline-source-map",
    output: {
      path: "dist/test",
      publicPath: "/",
      filename: "[name].js",
    },
    entry: {
      index: "./metatest/"
    },
    plugins: [
      new html({
        title: "Testdown Metatest"
      })
    ],
    module: {
      loaders: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          loader: "babel?cacheDirectory"
        },
        {
          test: /\.peg\.js$/,
          loader: "pegjs"
        },
        {
          test: /\.md$/,
          loader: "raw"
        }
      ]
    }
  }
]
