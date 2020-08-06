import game from "../game.js";
import DisplayObject from "../components/display-object.js";
import {stringToCallData} from "./call-by-path.js";
/// #if EDITOR
let latestDetectedSceneNode;
/// #endif
const getValueByPath = (valuePath, this_
	/// #if EDITOR
	, isLatestNodeGetting = false
	/// #endif
) => {
	assert(this_, "'this' argument is not provided in to 'getValueByPath'", 10028);
	assert(valuePath, "Empty data source path string.", 10029);
	let data = stringToCallData(valuePath);
	let path = data.p;
	let c;
	let rootName = path[0];
	/// #if EDITOR
	pathDebugging(this_, valuePath);
	/// #endif
	if(rootName === 'this') {
		c = this_;
	} else {
		/// #if EDITOR
		if(!isLatestNodeGetting && !(rootName in game)) {
			editor.ui.status.error("Unknown root element name '" + rootName + "' in '" + valuePath + "'.", 30025, this_, editor.getFieldNameByValue(this_, valuePath));
			return;
		}
		/// #endif
		c = game[rootName];
	}
	let i = 1;
	let fOwner;

	/// #if EDITOR
	if(!c && isLatestNodeGetting) {
		return c;
	}
	/// #endif

	while (i < path.length) {
		let n = path[i];
		fOwner = c;
		if(typeof n === 'string') {
			c = c[n];
		} else {
			c = c.getChildByName(n.s);
		}
		if(!c) {
			return c;
		}
		/// #if EDITOR
		if(c instanceof DisplayObject) {
			latestDetectedSceneNode = c;
		}
		/// #endif

		i++;
	}
	
	/// #if EDITOR
	if(isLatestNodeGetting) {
		return c;
	}
	/// #endif

	if(typeof c === "function") {
		return c.apply(fOwner, data.v);
	}
	return c;
};

const setValueByPath = (valuePath, val, this_) => {
	assert(this_, "'this' object is not provided in to 'setValueByPath'", 10030);
	assert(valuePath, "Empty setValueByPath string.", 10031);
	let path = stringToCallData(valuePath).p;
	let c;
	let rootName = path[0];
	/// #if EDITOR
	pathDebugging(this_, valuePath);
	/// #endif
	if(rootName === 'this') {
		c = this_;
	} else {
		/// #if EDITOR
		if(!(rootName in game)) {
			editor.ui.status.error("Unknown root element name '" + rootName + "' in '" + valuePath + "'.", 32015, this_, editor.getFieldNameByValue(this_, valuePath));
			return;
		}
		/// #endif
		c = game[rootName];
	}
	
	let i = 1;
	while (i < path.length-1) {
		let n = path[i];
		if(typeof n === 'string') {
			c = c[n];
		} else {
			c = c.getChildByName(n.s);
		}
		if(!c) {
			return;
		}
		i++;
	}
	let n = path[i];
	if(c[n] !== val) {
		assert(typeof c[n] !== 'function', "Attempt to override function in setValueByPath", 10069);
		c[n] = val;
	}
};

/// #if EDITOR
setValueByPath.___EDITOR_isGoodForCallbackChooser = true;

const getLatestSceneNodeBypath = (path, _this, suspendWarning = false) => {
	latestDetectedSceneNode = null;
	editor.rememberTryTime();
	try {
		getValueByPath(path, _this, true);
	} catch (er) {
		editor.checkTryTime();
		if(!suspendWarning) {
			console.warn('path validation exception: (' + path + '): ' + _this.___info + ' ' + ((typeof er) === 'object' ? er.message : er));
		}
	}
	return latestDetectedSceneNode;
};

const getLatestSceneNodesByComplexPath = (path, o) => {
	let ret = [];
	let pathsParts = path.split(/[,|`]/);
	for(let p of pathsParts) {
		if(!p) {
			ret.push(null);
		} else {
			ret.push(getLatestSceneNodeBypath(p, o));
		}
	}
	return ret;
};

const pathDebugging = (o, path) => {
	if(o instanceof DisplayObject) {
		if(o.hasOwnProperty('___pathBreakpoint') && o.___pathBreakpoint === path) {
			//data-path breakpoint activated
			debugger; // eslint-disable-line no-debugger
			delete o.___pathBreakpoint;
		}
	}
};

setValueByPath.___EDITOR_callbackParameterChooserFunction = () => {
	return new Promise((resolve) => {
		editor.ui.modal.showPrompt('Enter data path', '').then((enteredText1) => {
			if(enteredText1) {
				editor.ui.modal.showPrompt('Enter value', '').then((enteredText2) => {
					resolve([enteredText1, enteredText2]);
				});
			}
		});
	});
};
/// #endif


export default getValueByPath;
export {setValueByPath
	/// #if EDITOR
	, getLatestSceneNodeBypath,
	getLatestSceneNodesByComplexPath,
	pathDebugging
	/// #endif
};