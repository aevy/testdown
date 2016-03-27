var webpack = require("webpack")
var html = require("html-webpack-plugin")
module.exports = [
  {
    name: "example",
    target: "web",
    devtool: "inline-source-map",
    output: {
      path: "dist/example",
      publicPath: "/",
      filename: "[name].js",
    },
    entry: {
      index: "./example"
    },
    plugins: [
      new html({
        title: "Testdown Example"
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
