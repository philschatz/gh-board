const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const ManifestPlugin = require('webpack-manifest-plugin');
const OfflinePlugin = require('offline-plugin');
const Dashboard = require('webpack-dashboard/plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const ENV = process.env.NODE_ENV || 'development';

const config = {
  entry: {
    app: [
      './style/index.js',
      './src/index.js',
    ],
		vendor: ['react', 'react-router', 'react-bootstrap']
  },
  output: {
    path: path.resolve(__dirname, './dist'),
		filename: '[name].[hash:8].js',
		chunkFilename: '[id].[hash:8].chunk.js'
  },

  module: {
    rules: [
      {
        enforce: 'pre',
        test: /\.jsx?$/,
        loader: 'eslint-loader',
        exclude: [/node_modules|gantt-chart.*/, /octokat\.js/]
      },
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        exclude: [/node_modules/, /puzzle-script/, /octokat\.js/],
        query: { presets: ['react', 'es2015']}
      },
      {
        test: /\.json$/,
        loader: 'json-loader'
      },
      {
        test: /\.less$/,
        loader: ExtractTextPlugin.extract('css-loader!less-loader')
      },
      {
        test: /\.(png|jpg|svg)/,
        loader: 'file-loader?name=[name].[ext]'
      },
      {
        test: /\.(woff|woff2|eot|ttf)/,
        loader: 'url-loader?limit=30000&name=[name]-[hash].[ext]'
      }
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
  },

  plugins: ([
    new webpack.optimize.CommonsChunkPlugin({ name: 'vendor' }),
    new webpack.LoaderOptionsPlugin({
			options: {
				context: __dirname
			}
		}),
    new ExtractTextPlugin('app.css'),
    new webpack.DefinePlugin({
			'process.env.NODE_ENV': JSON.stringify(ENV)
		}),
		new HtmlWebpackPlugin({
			template: './src/index.html',
			title: 'GH-Board',
		 	removeRedundantAttributes: true,
			inject: false,
			manifest: `${ENV === 'production' ? './dist/manifest.json' : '/assets/manifest.json' }`,
			minify: {
				collapseWhitespace: true,
				removeComments: true
			},
			themeColor: '#f8f8f8',
      analytics: ENV === 'production'
		}),
    new ManifestPlugin({
			fileName: 'asset-manifest.json'
		})
  ])
  // Only for development
	.concat(ENV === 'development' ? [
		new webpack.HotModuleReplacementPlugin(),
		new Dashboard()
	] : [])
	// Only for production
	.concat(ENV === 'production' ? [
		new webpack.NoErrorsPlugin(),
		new CopyWebpackPlugin([
			{ from: './src/assets/manifest.json', to: './' },
			{ from: './src/assets/img', to: './img' }
		]),
		new OfflinePlugin({
			relativePaths: false,
			publicPath: '/',
			updateStrategy: 'all',
			preferOnline: true,
			safeToUseOptionalCaches: true,
			caches: 'all',
			version: 'GHBoard[hash]',
			ServiceWorker: {
				navigateFallbackURL: '/',
				events: true
			},
			AppCache: false
		})
  ] : []),

  stats: { colors: true },

  devtool: ENV === 'production' ? 'source-map' : 'inline-source-map',
  devServer: {
		port: process.env.PORT || 8080,
		host: '0.0.0.0',
		compress: true,
		contentBase: './src',
		historyApiFallback: true
	}
};

if (ENV === 'production') {
  config.output.publicPath = './dist/'; // gh-pages needs this to have a '.' for bundles
}

module.exports = config;
