const path = require('path');
const webpack = require('webpack');

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
  devtool: 'source-map',
  module: {
    loaders: [
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
      { test: /\.json$/, loader: 'json-loader'}, 
      { test: /\.less$/,  loader: ['style-loader', 'css-loader', 'less-loader'] },
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
    }
  }
};
