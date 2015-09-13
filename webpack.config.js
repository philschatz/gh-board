var path = require("path");
var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

var isBuild = process.env['BUILD'];

var config = {
    devtool: 'inline-source-map',
    // devtool: '#eval-source-map',
    debug: true,
    context: path.resolve(__dirname),
    entry: [
      // The following is added when `isBuild = falsy`
      // 'webpack-dev-server/client?http://0.0.0.0:8080', // WebpackDevServer host and port
      //'webpack/hot/only-dev-server',
      './style/index.js',
      './src/index.js'
    ],
    output: {
        path: __dirname + '/dist',
        publicPath: '/dist/',
        filename: 'bundle.js'
    },
    plugins: [
      new webpack.NoErrorsPlugin(),
      new ExtractTextPlugin('app.css')
    ],
    module: {
        preLoaders: [
          { test: /\.jsx?$/, loader: 'eslint-loader', exclude: /node_modules/ },
        ],
        loaders: [
            { test: /\.jsx?$/, loaders: ['react-hot', 'babel'], exclude: /node_modules/ },
            { test: /\.less$/,  loader: ExtractTextPlugin.extract('css!less') },
            { test: /\.(png|jpg|svg)/, loader: 'file-loader?name=[name].[ext]'},
            { test: /\.(woff|woff2|eot|ttf)/, loader: "url-loader?limit=30000&name=[name]-[hash].[ext]" }
        ]
    },
    resolve: {
      alias: {
        xmlhttprequest: path.join(__dirname, '/src/hacks/xmlhttprequest-filler.js'),
      },
    },
    devServer: {
      // hot: true // Added when `isBuild = falsy`
    }
};

if (!isBuild) {
  config.entry.unshift('webpack/hot/only-dev-server');
  config.entry.unshift('webpack-dev-server/client?http://0.0.0.0:8080');
  config.devServer.hotComponents = true;
}

module.exports = config;
