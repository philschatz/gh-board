const path = require('path')
const webpack = require('webpack')
const ExtractTextPlugin = require('extract-text-webpack-plugin')

const isBuild = process.env['NODE_ENV'] === 'production'

const config = {
  devtool: isBuild ? 'source-map' : 'eval-source-map',
  context: path.resolve(__dirname),
  entry: ['./style/index.js', './src/index.js'],
  output: {
    path: __dirname + '/dist',
    publicPath: isBuild ? './dist/' : '/dist/', // gh-pages needs this to have a '.' for bundles
    filename: 'bundle.js',
  },
  plugins: [
    new ExtractTextPlugin('app.css'),
    new webpack.DefinePlugin({
      'process.env': { NODE_ENV: process.env['NODE_ENV'] },
    }),
  ].concat(isBuild ? [new webpack.NoErrorsPlugin()] : []),
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        exclude: [/node_modules/],
        query: {
          presets: ['react', 'es2015'],
          plugins: ['transform-object-rest-spread'],
        },
      },
      {
        test: /\.less$/,
        loader: ExtractTextPlugin.extract('css-loader!less-loader'),
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
  },
}

module.exports = config
