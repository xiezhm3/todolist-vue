const path = require("path");
const HTMLPlugin = require("html-webpack-plugin");
const webpack = require("webpack");

const isDev = process.env.NODE_ENV === "development";

const config = {
	target: "web",
	entry: path.join(__dirname, "src/index.js"),
	output: {
		filename: "bundle.js",
		path: path.join(__dirname, "dist")
	},
	module: {
		rules: [{
			test: /\.vue$/,
			loader: "vue-loader"
		}, {
			test: /\.css$/,
			use: [
				"style-loader",
				"css-loader"
			]
		}, {
			//stylus pre handler
			test: /\.styl$/,
			use: [
				"style-loader",
				"css-loader",
				"stylus-loader"
			]
		}, {
			test: /\.(gif|jpg|jpeg|png|svg)$/,
			use: [{
				loader: "url-loader",
				options: {
					limit: 1024,
					name: "[name]-x.[ext]"
				}
			}]
		}]
	},
	plugins: [
		new webpack.DefinePlugin({
			"process.env": {
				NODE_ENV: isDev ? "'development'" : "'production'"
			}
		}),
		new HTMLPlugin() // html that act as a container to contain js file => entry point
	]
};

if (isDev) {
	config.devtool = "#cheap-module-eval-source-map"; //compiled code reflect to source code
	config.devServer = {
		port: "8000",
		host: "0.0.0.0", // localhost:8080 or using local ip
		overlay: {
			errors: true //show the wrong message on the website
		},
		// open: true
		hot: true // hot replace module
	};
	config.plugins.push(
		new webpack.HotModuleReplacementPlugin(),
		new webpack.NoEmitOnErrorsPlugin()
	);
}

module.exports = config;