var path = require("path");
var webpack = require('webpack');
module.exports = {
    devtool: 'inline-source-map',
    // devtool: '#eval-source-map',
    debug: true,
    context: path.resolve(__dirname),
    entry: [
      'webpack/hot/dev-server', // 'webpack/hot/only-dev-server',
      "./src/index.js"
    ],
    output: {
        path: './dist',
        filename: "bundle.js"
    },
    module: {
        preLoaders: [
          { test: /\.jsx?$/, loader: 'eslint-loader', exclude: /node_modules/ },
        ],
        loaders: [
            { test: /\.jsx?$/, loaders: ['react-hot', 'babel'], exclude: /node_modules/ },
            // { test: /\.css$/, loader: "style!css" }
        ]
    },
    plugins: [
      new webpack.NoErrorsPlugin()
    ],
    resolve: {
      alias: {
        xmlhttprequest: path.join(__dirname, '/src/hacks/xmlhttprequest-filler.js'),
      },
    },
};
