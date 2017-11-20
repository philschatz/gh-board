const path = require('path');
const webpack = require('webpack');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const isBuild = process.env['NODE_ENV'] === 'production';

module.exports = {
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
  context: path.resolve(__dirname),
  devtool: isBuild ? false : 'source-map',
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: [/node_modules/, /puzzle-script/, /octokat\.js/],
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              'react',
              'env'
            ],
            plugins: [
              'react-require',
              'transform-object-rest-spread',
              'transform-class-properties'
            ],
          }
        },
      },
      {
        test: /\.less$/,
        use: isBuild ? ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            {
              loader: 'css-loader',
              options: {
                minimize: true
              }
            },
            'less-loader'
          ]
        }) :
        ['style-loader', 'css-loader', 'less-loader']
      },
      { test: /\.json$/, use: 'json-loader'},
      { test: /\.(png|jpg|svg)/, use: 'file-loader?name=[name].[ext]'},
      { test: /\.(woff|woff2|eot|ttf)/, use: 'url-loader?limit=30000&name=[name]-[hash].[ext]' }
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
    }
  },
  plugins: isBuild ? [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    }),
    new ExtractTextPlugin('app.css'),
    new UglifyJsPlugin()
  ] : []
};
