
const path = require("path");
const fs = require('fs');
/*global __dirname */
/*global require */
/*global process */

function getLibRoot(libName) {
	return path.join(__dirname, '../..', libName);
}

const projectPath = path.join(__dirname, '../../', process.argv[2]);
process.chdir(projectPath);
const isDebug = process.argv.indexOf('debug') >= 0;

let projectDesc = {};
const descPath = path.join(projectPath, 'thing-project.json');
if(fs.existsSync(descPath)) {
	let pureProjectDesc = JSON.parse(fs.readFileSync(descPath));
	
	if(pureProjectDesc.libs) {
		for(let libName of pureProjectDesc.libs) {
			let libSettingsFilename = path.join(getLibRoot(libName), 'settings.json');
			if(fs.existsSync(libSettingsFilename)) {
				projectDesc = Object.assign(projectDesc, JSON.parse(fs.readFileSync(libSettingsFilename)));
			}
		}
	}
	projectDesc = Object.assign(projectDesc, pureProjectDesc);

}

let confPath = isDebug ? projectDesc.__webpack.debug : projectDesc.__webpack.production;

if(fs.existsSync(path.join(projectPath, confPath))) {
	confPath = path.join(projectPath, confPath);
}

const projectConfig = require(confPath);

const webpack = require("webpack");
webpack(projectConfig, (err, stats) => {

	function errorHandle(err) {
		var txt = 'ERROR: '+ err;
		console.error(txt);
	}
	function warnHandle(err) {
		var txt = 'WARNING: '+ err;
		console.log(txt);
	}
	if (err) {
		if (err.details) {
			err.details.some(errorHandle);
		}
	} else {

		const info = stats.toJson();

		if (stats.hasErrors()) {
			info.errors.some(errorHandle);
		}

		if (stats.hasWarnings()) {
			info.warnings.some(warnHandle);
		}
	}
});
