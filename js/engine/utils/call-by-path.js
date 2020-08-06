import {pathDebugging, setValueByPath} from "./get-value-by-path.js";
import game from "../game.js";

const callByPath = (callbackPath, this_) => {
	assert(this_, "'this' argument is not provided in to 'callByPath'.", 10026);
	assert(callbackPath, "Empty callByPath string.", 10027);

	let data = stringToCallData(callbackPath);
	let path = data.p;
	let c;
	let rootName = path[0];
	/// #if EDITOR
	pathDebugging(this_, callbackPath);
	/// #endif
	if(rootName === 'this') {
		c = this_;
	} else {
		/// #if EDITOR
		if(!(rootName in game)) {
			editor.ui.status.error("Unknown root element name '" + rootName + "' in '" + callbackPath + "'.", 30025, this_, editor.getFieldNameByValue(this_, callbackPath));
			return;
		}
		/// #endif
		c = game[rootName];
	}
	let i = 1;
	let fOwner;
	while (i < path.length) {
		let n = path[i];
		fOwner = c;
		if(typeof n === 'string') {
			assert(n.indexOf(',') < 0, "Comma ',' character detected in field name in callback`s path: " + callbackPath + '". Use "`" character to separate callback\s parameter block.', 10025);
			/// #endif
			c = c[n];
		} else {
			c = c.getChildByName(n.s);
		}
		
		assert(c, "Can't find " + ((typeof n === 'string') ? "property '" + n : "child '#" + n.s) + "' in callback`s path: " + callbackPath, 10025);
		
		i++;
	}
	if(data.hasOwnProperty('v')) {
		if(c === setValueByPath) {
			return setValueByPath(data.v[0], data.v[1], this_);
		}
		return c.apply(fOwner, data.v);
	} else {
		return c.call(fOwner);
	}
};

const _callsCahce = {};

const stringToCallData = (s) => {
	if(_callsCahce.hasOwnProperty(s)) {
		return _callsCahce[s];
	}
	let data = {};
	
	let a = s.split('`');
	data.p = a[0].split('.').map(pathPartsMapper);
	if(a.length > 1) {
		data.v = a[1].split(',').map(turnInToNumberIfNumeric);
	}
	_callsCahce[s] = data;
	return data;
};

const numChecker = /^\-?[\.0-9]+$/;
const turnInToNumberIfNumeric = (s) => {
	if(s.match(numChecker)) {
		return parseFloat(s);
	}
	return s;
};

const pathPartsMapper = (s) => {
	if(s.charCodeAt(0) === 35) {//'#'
		return {s:s.substr(1)}; // - child name
	}
	return s;
};

export default callByPath;
export {stringToCallData};