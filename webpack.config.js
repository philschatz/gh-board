const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const isBuild = process.env['NODE_ENV'] === 'production';

const config = {
  // devtool: '#eval-source-map',
  devtool: 'source-map',
  context: path.resolve(__dirname),
  entry: [
    './style/index.js',
    './src/index.js'
  ].concat(isBuild ? [] : [
    'webpack-dev-server/client?http://0.0.0.0:8080'
  ]),
  output: {
    path: __dirname + '/dist',
    publicPath: isBuild ? './dist/' : '/dist/', // gh-pages needs this to have a '.' for bundles
    filename: 'bundle.js'
  },
  plugins: [
    new ExtractTextPlugin('app.css'),
    new webpack.DefinePlugin({ 'process.env': { NODE_ENV: process.env['NODE_ENV'] } })
  ].concat(isBuild ? [
    new webpack.NoErrorsPlugin(),
  ] : []),
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        exclude: [/node_modules/, /puzzle-script/, /octokat\.js/],
        query: {
          presets: ['react', 'es2015'],
          plugins: ['transform-object-rest-spread']
        }
      },
      { test: /\.json$/, loader: 'json-loader'},
      { test: /\.less$/,  loader: ExtractTextPlugin.extract('css-loader!less-loader') },
      { test: /\.(png|jpg|svg)/, loader: 'file-loader?name=[name].[ext]'},
      { test: /\.(woff|woff2|eot|ttf)/, loader: 'url-loader?limit=30000&name=[name]-[hash].[ext]' }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
    alias: {
      xmlhttprequest: path.join(__dirname, '/src/hacks/xmlhttprequest-filler.js'),
      fs: path.join(__dirname, '/src/hacks/mermaid-stubs.js'),
      proxyquire: path.join(__dirname, '/src/hacks/mermaid-stubs.js'),
      rewire: path.join(__dirname, '/src/hacks/mermaid-stubs.js'),
      'mock-browser': path.join(__dirname, '/src/hacks/mermaid-stubs.js')
    },
  }
};

module.exports = config;
