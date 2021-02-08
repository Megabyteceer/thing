/// #if EDITOR
import Tip from "./tip.js";

/*
/// #endif
throw 'Editor time sources was accidentally imported in to final game build. Please wrap with "#if EDITOR" tags all thing-editor imports, which start not with "thing-editor/js/engine/". More: https://github.com/Megabyteceer/thing-editor/wiki/Custom-Components#tags';
//*/

let factories = {};
window.R = factories;

['div', 'span', 'img', 'button', 'input', 'label', 'b', 'a', 'br', 'hr', 'svg', 'polyline', 'textarea', 'iframe'].some((factoryType) => {
	factories[factoryType] = (...theArgs) => {
		return React.createElement.call(this, factoryType, ...theArgs);
	};
});

R.fragment = function(...theArgs) {
	return React.createElement(React.Fragment, null, ...theArgs);
};

R.spinner = () => {
	return R.div(null, 'Loading...'
	);
};

let _iconsCache = {};
R.icon = (name) => {
	if(!_iconsCache.hasOwnProperty(name)) {
		assert(name, "Icon's name expected.");
		let src;
		if(name.startsWith('/')) {
			src = name;
		} else {
			src = '/thing-editor/img/' + name;
		}
		src += '.png';
		_iconsCache[name] = R.img({src});
	}
	return _iconsCache[name];
};

let libNum = 0;
let _libInfoCache = {};
R.libInfo = (libName) => {
	if(!_libInfoCache.hasOwnProperty(libName)) {
		_libInfoCache[libName] = {
			name: libName,
			icon: R.span({onDoubleClick: (ev) => {
				editor.fs.editFile(libName);
				sp(ev);
			}, title: "LIBRARY: " + libName, className: 'lib-icon'}, R.icon('lib' + (libNum++ % 5)))
		};
	}
	return _libInfoCache[libName];
};

R.classIcon = (constructor) => {
	return R.icon(constructor.__EDITOR_icon || 'tree/game');
};

R.multilineText = (txt) => {
	if(!(typeof txt === 'string')) {
		return txt;
	}
	return R.div(null, txt.split('\n').map((r, i) =>{
		return R.div({key:i}, r);
	}));
};

let nameProps = {className: 'scene-node-name'};
let classProps = {className: 'scene-node-class'};
let sceneNodeProps = {className: 'scene-node-item'};

R.sceneNode = (node) => {
	return R.span(sceneNodeProps, R.classIcon(node.constructor), R.span(nameProps, node.name), R.span(classProps, ' (' + node.constructor.name + ') #' + node.___id));
};

R.listItem = (view, item, key, parent, help) => {
	let className = 'list-item';
	if(parent.selectedItem === item) {
		className += ' item-selected';
	}
	
	return R.div({
		'data-help' : help,
		className: className, key: key, onMouseDown: (ev) => {
			if(parent.selectedItem !== item || parent.reselectAllowed) {
				let itemToSelect = parent.onSelect(item, ev, parent.selectedItem) || item;
				if(parent.selectedItem !== itemToSelect) {
					parent.selectedItem = itemToSelect;
					parent.forceUpdate();
				}
			}
		}
	}, view);
};

R.tip = (id, header, text) => {
	return React.createElement(Tip, {id, header, text});
};

let _outJumpsMap = new Map();
window.debouncedCall = (f, timeMs = 0) => {
	if(_outJumpsMap.has(f)) {
		clearTimeout(_outJumpsMap.get(f));
		_outJumpsMap.delete(f);
	}
	_outJumpsMap.set(f, setTimeout(() => {
		_outJumpsMap.delete(f);
		f();
	}, timeMs));
};

window.sp = (ev) => {
	ev.stopPropagation();
	ev.preventDefault();
};

window.addEventListener('contextmenu', (ev) => {
	if(window.isEventFocusOnInputElement(ev)) return;
	sp(ev);
	
});

window.addEventListener('keydown', (ev) => {
	if(ev.key === 'F5') {
		/* sp(ev);
		 editor.reloadAssetsAndClasses();*/
	}
	
	if(!window.isEventFocusOnInputElement(ev)) {
		switch(ev.key) {
		case "ArrowUp":
			editor.onSelectedPropsChange('y', ev.ctrlKey ? -10 : -1, true);
			sp(ev);
			break;
		case "ArrowDown":
			editor.onSelectedPropsChange('y', ev.ctrlKey ? 10 : 1, true);
			sp(ev);
			break;
		case "ArrowLeft":
			editor.onSelectedPropsChange('x', ev.ctrlKey ? -10 : -1, true);
			sp(ev);
			break;
		case "ArrowRight":
			editor.onSelectedPropsChange('x', ev.ctrlKey ? 10 : 1, true);
			sp(ev);
			break;
		}
	}
	
});

window.copyTextByClick = function(ev) {
	if(ev.ctrlKey) {
		editor.copyToClipboard(ev.target.hasAttribute('ctrlclickcopyvalue') ? 
			ev.target.getAttribute('ctrlclickcopyvalue') : ev.target.innerText);
		sp(ev);
	}
};
/*
const checkDataPath = (s) => {
	if(s) {
		if(
			!s.startsWith('this.') && 
			!s.startsWith('all.') && 
			!s.startsWith('game.')
		) {
			if(!editor.Lib.classes.hasOwnProperty(s.substr(0, s.indexOf('.')))) {
				return '"this", "all", "game", or class name expected as root element';
			}
		}
	}
};*/

window.__EDITOR_editableProps = (class_, array) => {
	assert(!class_.hasOwnProperty('__EDITOR_editableProps'), "Editable properties for class '" + class_.name + "' already defined.", 40003);
	for(let p of array) {
		/*if(p.type === 'data-path' || p.type === 'callback') {
			p.validate = checkDataPath;
		}*/
		if(!p.helpUrl && !window.editor) { // !editor - detect embedded classes, which loaded before editor created
			let cn = class_.name;
			if(cn === 'DisplayObject') {
				cn = 'Container';
			}
			p.helpUrl = 'components.' + cn + '#' + p.name.replace('.', '');
		}
	}
	if(!array.__EDITOR_propsArrayReversedAlready) {
		array.reverse();
		array.__EDITOR_propsArrayReversedAlready = true;
	}
	class_.__EDITOR_editableProps = array;
};

//======== wrapPropertyWithNumberChecker - make numeric property sensitive for NaN assigning

let _definedProps = new WeakMap();
let _valStore = new WeakMap();

let _getValStore = (o) => {
	if(!_valStore.has(o)) {
		_valStore.set(o, {});
	}
	return _valStore.get(o);
};

window.shakeDomElement = function(e) {
	e.classList.remove('shake');
	setTimeout(() => {
		e.classList.add('shake');
	}, 1);
};

window.wrapPropertyWithNumberChecker = function wrapPropertyWithNumberChecker(constructor, propertyName) {
	
	if(!_definedProps.has(constructor)) {
		_definedProps.set(constructor, {});
	}
	let o = _definedProps.get(constructor);
	if(o.hasOwnProperty(propertyName)) return; //wrapped already
	o[propertyName] = true;
	
	let originalSetter;
	
	let newSetter = function wrapPropertyWithNumberCheckerSetter(val) {
		assert(typeof val === 'number' && !isNaN(val), 'invalid value for "' + propertyName + '". Valid number value expected.', 10001);
		originalSetter.call(this, val);
	};
	

	let d;
	
	let prot = constructor.prototype;
	while (prot) {
		d = Object.getOwnPropertyDescriptor(prot, propertyName);
		if(d) {
			//console.log("Property " + propertyName + " wrapped.")
			originalSetter = d.set;
			if(originalSetter.name === 'wrapPropertyWithNumberCheckerSetter') {
				return;
			}
			d.set = newSetter;
			break;
		}
		prot = Object.getPrototypeOf(prot);
	}
	
	if(!d) {
		//console.log("Own property " + propertyName + " wrapped.")
		let privValue = '__wrapper_store_' + propertyName;
		
		originalSetter = function(val) {
			_getValStore(this)[privValue] = val;
		};
		d = {
			set: newSetter, get: function() {
				return _getValStore(this)[privValue];
			}
		};
	}
	
	try {
		Object.defineProperty(constructor.prototype, propertyName, d);
	} catch(er) {
		assert(false, "Can not add NaN checking for property '" + propertyName + "'. Please make this property configurable or add noNullCheck flag in it`s descriptor.", 40903);
	}
};

window.isEventFocusOnInputElement = (ev) => {
	let tag = ev.target.tagName;
	return (((tag === 'INPUT') && (ev.target.type !== 'checkbox')) || tag === 'TEXTAREA' || tag === 'SELECT');
};

window.makePreviewSoundButton = function(propName) {
	return {
		type: 'btn',
		title: 'Preview ' + propName + ' sound',
		name: propName + ' ▶',
		visible: (o) => {
			return o[propName];
		},
		onClick: (o) => {
			editor.ui.soundsList.soundClick(o[propName], o.volume || 1);
		}
	};
};


window.makePreviewModeButton = function(title, helpUrl) {
	let previewBtnProperty = {
		type: 'btn',
		title,
		helpUrl,
		name: title,
		onClick: (o) => {
			if(o.__EDITOR_component_in_previewMode) {
				o.__EDITOR_inner_exitPreviewMode();
			} else {
				o.__EDITOR_inner_goToPreviewMode();
			}
			editor.refreshPropsEditor();
		}
	};
	Object.defineProperty(previewBtnProperty, 'className', {
		get: () => {
			let o = editor.selection[0];
			return (o.__EDITOR_component_in_previewMode) ? 'danger-btn' : undefined;
		}
	});
	return previewBtnProperty;
};

window.makePrefabSelector = function makePrefabSelector(startsWith, canBeEmpty = true, filter = null) {
	return () => {
		let ret = [];
		if(canBeEmpty) {
			ret.push({name:' ', value:''});
		}
		let a = editor.Lib._getAllPrefabs();
		for(let name in a) {
			if(!startsWith || name.startsWith(startsWith)) {
				ret.push({name:name, value:name});
			}
		}
		if(filter) {
			return ret.filter(filter);
		}
		return ret;
	};
};

window.addEventListener('beforeunload', function() {
	editor.exitPrefabMode();
	if(!editor.game || !editor.game.__EDITOR_mode) { //backup already exist
		return;
	}
	editor.saveCurrentScenesSelectionGlobally();
	if(window.editor && editor.game && editor.isCurrentSceneModified && editor.game.__EDITOR_mode && !editor.__projectReloading) {
		editor.saveBackup(true);
	}
});

window.makeSoundSelector = function makeSoundSelector(startsWith, canBeEmpty = true) {
	return () => {
		let ret = [];
		if(canBeEmpty) {
			ret.push({name:'EMPTY', value:''});
		}
		let a = editor.Lib.__soundsList;
		for(let i of a) {
			if(!startsWith || i.name.startsWith(startsWith)) {
				ret.push(i);
			}
		}
		return ret;
	};
};

window.makeResourceSelectEditablePropertyDescriptor = (name, canBeEmpty, important, filter) => {
	return {
		name: name,
		type: String,
		default: '',
		important: important,
		select:  () => {
			let a = editor.Lib.__resourcesList;
			if(filter) {
				a = a.filter(filter);
			}
			if(canBeEmpty || a.length < 1) {
				a = a.concat();
				a.unshift({
					name: "none",
					value: ""
				});
			}
			return a;
		}
	};
};

window.makeImageSelectEditablePropertyDescriptor = (name, canBeEmpty, important, filterName = 'image') => {
	return {
		name: name,
		type: String,
		default: canBeEmpty ? '' : 'EMPTY',
		important: important,
		filterName,
		afterEdited: () => {
			for(let o in editor.selection) {
				if(!editor.Lib.hasTexture(o[name])) {

					editor.game.__loadDynamicTextures();
					return;
				}

			}

		},
		select: () => {
			let ret;
			if(canBeEmpty) {
				ret = editor.Lib.__texturesList.concat();
				ret.unshift({
					"name": "none",
					"value": ""
				});
			} else {
				ret = editor.Lib.__texturesList;
			}
			let currentVal = false;
			for(let o of editor.selection) {
				if(currentVal !== false && currentVal !== o[name]) {
					return ret;
				}
				currentVal = o[name];
			}
			if((typeof currentVal === "string") && (!ret.find((i) => {
				return i.value === currentVal;
			}))) {
				let a = [];
				for(let i of ret) {
					if(i.value.indexOf(currentVal.replace(/\.(png|jpg)/,'')) >= 0 || currentVal.indexOf(i.value.replace(/\.(png|jpg)/,'')) >= 0) {
						a.unshift(i);
					} else {
						a.push(i);
					}
				}
				ret = a;
			}
			return ret;
		}
	};
};

function _searchByRegexpOrText(source, query) {
	if(!query) return true;
	try {
		return source.search(query) >= 0;
	} catch(er) {
		return source.indexOf(query) >= 0;
	}
}

export {_searchByRegexpOrText};


export default {
	protectAccessToSceneNode: (o, debugName) => {
		o.remove = () => {
			assert(false, "Attempt to remove system node" + debugName, 10002);
		};
		o.destroy  = () => {
			assert(false, "Attempt to destroy system node " + debugName, 10003);
		};
		o.detachFromParent  = () => {
			assert(false, "Attempt to detachFromParent system node " + debugName, 10004);
		};
		o.___EDITOR_isHiddenForChooser = true;
	}
};