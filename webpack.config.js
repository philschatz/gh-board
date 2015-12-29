var path = require("path");
var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

var isBuild = process.env['NODE_ENV'] === 'production';

var config = {
    // devtool: '#eval-source-map',
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
        publicPath: './dist/', // gh-pages needs this to have a '.' for bundles
        filename: 'bundle.js'
    },
    plugins: [
      new webpack.NoErrorsPlugin(),
      new ExtractTextPlugin('app.css')
    ],
    module: {
        preLoaders: [
          { test: /\.jsx?$/, loader: 'eslint-loader', exclude: /node_modules|gantt-chart.*/ },
        ],
        loaders: [
            { test: /\.jsx?$/, loader: 'babel', exclude: [/node_modules/, /puzzle-script/], query: { presets: ['react', 'es2015']} },
            { test: /\.less$/,  loader: ExtractTextPlugin.extract('css!less') },
            { test: /\.(png|jpg|svg)/, loader: 'file-loader?name=[name].[ext]'},
            { test: /\.(woff|woff2|eot|ttf)/, loader: "url-loader?limit=30000&name=[name]-[hash].[ext]" }
        ]
    },
    resolve: {
      extensions: ['', '.js', '.jsx'],
      alias: {
        xmlhttprequest: path.join(__dirname, '/src/hacks/xmlhttprequest-filler.js'),
      },
    },
    devServer: {
      // hot: true // Added when `isBuild = falsy`
    }
};

if (isBuild) {
  // Remove React warnings and whatnot
  config.plugins.unshift(new webpack.DefinePlugin({ 'process.env': { NODE_ENV: JSON.stringify('production') } }));
} else {
  config.debug = true;
  config.output.publicPath = '/dist/'; // Dev server needs this to not have a dot.
  config.devtool = 'inline-source-map';
  // config.entry.unshift('webpack/hot/only-dev-server');
  config.entry.unshift('webpack-dev-server/client?http://0.0.0.0:8080');
  config.devServer.hotComponents = true;
}

module.exports = config;
