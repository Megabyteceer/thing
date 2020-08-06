/*global module */
/*global require */
/*global process */
/*global __dirname */

const fs = require('fs');
const path = require('path');
const isDebug = (process.argv.indexOf('debug') >= 0) || process.env.THING_ENGINE_DEBUG_BUILD;

const glob = require('glob');

const ignore = '*/.*|' + (isDebug ?'*/___*' : '*/__*');

let copyFilesList = [];

let addedFiles = new Set();

let projectHasSounds;

function addSoundsFolderToCopy(libName) {
	let files = glob((libName || '.') + '/snd/**/*.@(webm|weba|ogg|aac|mp3)', {absolute: true, sync:true, ignore});
	for(let from of files) {
		if(from.indexOf('/~') < 0) {
			let a = from.split('/snd/');
			a.shift();
			let to =  './snd/' + a.join('/snd/');
			if(!addedFiles.has(to)) {
				addedFiles.add(to);
				copyFilesList.push({from, to});
				projectHasSounds = true;
			}
		}
	}
}

function addImagesFolderToCopy(libName) {
	let files = glob((libName || '.') + '/img/**/*.@(png|jpg|atlas|json|xml)', {absolute: true, sync:true, ignore});
	for(let from of files) {
		if(from.indexOf('/~') < 0) {
			let a = from.split('/img/');
			a.shift();
			let to =  './img/' + a.join('/img/');
			if(!addedFiles.has(to)) {
				addedFiles.add(to);
				copyFilesList.push({from, to});
			}
		}
	}
}

addImagesFolderToCopy();
addSoundsFolderToCopy();


let alias = {
	'/thing-editor': path.resolve(__dirname, '..'),
	'thing-editor': path.resolve(__dirname, '..'),
	'src': path.resolve(process.cwd(), 'src')
};

let projectDesc = JSON.parse(fs.readFileSync('./thing-project.json'));
if(projectDesc.libs) {

	let libs = projectDesc.libs.slice();
	libs.reverse();

	for(let libName of libs) {
		let libRootFolder = path.join(__dirname, '../..', libName);
		if(!fs.existsSync(libRootFolder)) {
			libRootFolder = require.resolve(libName);
		}
		if(fs.existsSync(libRootFolder)) {

			alias[libName] = libRootFolder;

			if(fs.existsSync(path.join(libRootFolder, 'snd'))) {
				addSoundsFolderToCopy(libRootFolder);
			}
			if(fs.existsSync(path.join(libRootFolder, 'img'))) {
				addImagesFolderToCopy(libRootFolder);
			}
		} else {
			throw new Error("library folder '" + libName + "' not found.");
		}
	}
}


const CopyWebpackPlugin = require('copy-webpack-plugin');

copyFilesList.reverse();

const webpack = require('webpack');

let entry = [
	"babel-polyfill",
	"whatwg-fetch"
];
if(projectDesc.webfontloader && Object.keys(projectDesc.webfontloader).some((k) => {
	let p = projectDesc.webfontloader[k];
	return Array.isArray(p.families) && p.families.length > 0;
})) {
	entry.push('webfontloader');
}
if(projectHasSounds) {
	entry.push(isDebug ? 'howler/dist/howler.js' : 'howler/dist/howler.core.min.js');
}

entry = entry.concat([
	'./assets.js',
	'./src/classes.js',
	'./src/index.js'
]);

const mode = isDebug ? 'development' : 'production';

module.exports = {
	entry,
	mode: mode,
	resolve: {
		alias/*,
		modules: ['node_modules', path.join(__dirname, '..')]*/
	},
	devtool: isDebug ? 'inline-source-map' : undefined,
	optimization: {
		minimize: !isDebug
	},
	output: {
		filename: 'bundle.js',
		path: path.resolve(process.cwd(), isDebug ? 'debug' : 'release')
	},
	performance: {
		maxAssetSize: 1000000
	},
	plugins: [
		new webpack.DefinePlugin({
			'process.env.NODE_ENV': JSON.stringify(mode)
		}),
		new CopyWebpackPlugin(copyFilesList),
		new webpack.ProvidePlugin({
			PIXI: 'pixi.js-legacy',
		})],
	module: {
		noParse: /webfontloader/,
		rules: [{
			test: /\.(png|svg|jpg|gif)$/,
			use: [
				'file-loader'
			]
		},
		{
			test: /\.js$/,
			exclude: [/min\.js$/],
			loaders: [
				{
					loader: 'babel-loader',
					options: {
						presets: [['@babel/preset-env',
							{
								"useBuiltIns": "entry",
								"targets": "last 3 Chrome versions, last 3 Firefox versions, last 2 Edge versions, last 2 Opera versions, last 3 ChromeAndroid versions, last 5 FirefoxAndroid versions, last 3 iOS versions, last 3 Safari versions"
							}]]
					}
				},
				'ifdef-loader?{"EDITOR":false,"DEBUG":' + (isDebug ? 'true' : 'false') + '}',
				path.resolve(__dirname, 'assert-strip-loader.js')
			]
		},
		{
			test: /\.js$/,
			include: [
				path.resolve(__dirname, "../js/editor")
			],
			loaders:[
				path.resolve(__dirname, 'editor-code-bundle-prevent.js')
			]
		}]
	}
};
