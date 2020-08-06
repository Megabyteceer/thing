import game from "thing-editor/js/engine/game.js";
import {getLatestSceneNodeBypath, getLatestSceneNodesByComplexPath} from "thing-editor/js/engine/utils/get-value-by-path.js";
import Lib from "thing-editor/js/engine/lib.js";
import MovieClip from "thing-editor/js/engine/components/movie-clip/movie-clip.js";
import DisplayObject from "thing-editor/js/engine/components/display-object.js";

export default class DataPathFixer {

	static rememberPathReferences() {
		if(beforeNameEditOldValues) {
			DataPathFixer.onNameBlur();
		}
		_validateRefEntryOldName = null;
		_validateRefEntryNewName = null;
		if(game.currentScene) {
			game.currentScene._refreshAllObjectRefs();
		}
		refs = new Map();
		_rememberPathReference(game.currentContainer);
		game.currentContainer.forAllChildren(_rememberPathReference);
	}

	static validatePathReferences(oldName, newName) {
		_validateRefEntryOldName = oldName;
		_validateRefEntryNewName = newName;
		if(game.currentScene) {
			game.currentScene._refreshAllObjectRefs();
		}
		refs.forEach(validateRefEntry);
	}

	static beforeNameEdit(newName) {
		nameEditNameName = newName;
		if(!beforeNameEditOldValues) {
			DataPathFixer.rememberPathReferences();
			beforeNameEditOldValues = editor.selection.map(o => o.name);
		}
	}

	static onNameBlur() {
		if(beforeNameEditOldValues) {
			DataPathFixer.validatePathReferences(beforeNameEditOldValues, nameEditNameName);
			beforeNameEditOldValues = null;
		}
	}
}

let nameEditNameName;
let beforeNameEditOldValues;

let _validateRefEntryOldName;
let _validateRefEntryNewName;

const tryToFixDataPath = (node, fieldname, path_, oldRefs, currentRefs) => {

	let pathes = path_.split(/[,|`]/);
	let atLeastOnePartFixed = false;

	assert(pathes.length === oldRefs.length, "DataPathFixer refs count does not match.");
	
	for(let j = 0; j < oldRefs.length; j++) {

		let currentRef = currentRefs[j];
		let oldRef = oldRefs[j];
		if(currentRef === oldRef) {
			continue;
		}

		let path = pathes[j];

		if(!oldRef || !oldRef.parent) {
			return;
		}

		let repairNode;
		let newPath = path;
		if(_validateRefEntryOldName) { //it is was renaming. try to fix .#names
			for(let oldName of _validateRefEntryOldName) {
				if(oldName) {
					oldName = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
					let pathFixer = new RegExp('\\.#' + oldName + '(\\.|$)');
					let pathFixer2 = new RegExp('(\\.all\\.)' + oldName + '(\\.|$)');
					let pathFixer3 = new RegExp('^all\\.' + oldName + '(\\.|$)');
					newPath = newPath.replace(pathFixer, '.#' + _validateRefEntryNewName + '$1');
					newPath = newPath.replace(pathFixer2, '$1' + _validateRefEntryNewName + '$2');
					newPath = newPath.replace(pathFixer3, 'all.' + _validateRefEntryNewName + '$1');
				}
			}
			repairNode = getLatestSceneNodeBypath(newPath, node);
		} else { //node added or removed

			let pathParts = path.split('.');
			for(let i = 0; i < pathParts.length;) { //try to remove one of the part of chain
				i++;
				let a = pathParts.slice(0);
				a.splice(i, 1);
				newPath = a.join('.');
				repairNode = getLatestSceneNodeBypath(newPath, node, true);
				if(repairNode === oldRef) {
					break;
				}
			}

			if(repairNode !== oldRef) { //try to insert "parent" somwhere in chain
				for(let i = 0; i < pathParts.length;) { 
					i++;
					let a = pathParts.slice(0);
					a.splice(i, 0, 'parent');
					newPath = a.join('.');
					repairNode = getLatestSceneNodeBypath(newPath, node, true);
					if(repairNode === oldRef) {
						break;
					}
				}
			}

			if(repairNode !== oldRef) { //try to insert new name somewhere in chain
				let changedNode = editor.selection[0];
				let changedName = changedNode.name;
				if(!changedName) {
					changedName = 'new' + changedNode.constructor.name;
					let i = 1;
					while(changedNode.parent.getChildByName(changedName + i)){
						i++;
					}
					changedName += i;
					changedNode.name = changedName;
					Lib.__invalidateSerializationCache(changedNode);
					setTimeout(() => {
						editor.ui.propsEditor.selectField('name', true, true);
					}, 1);
				}
				changedName = '#' + changedName;
				for(let i = 0; i < pathParts.length;) { 
					i++;
					let a = pathParts.slice(0);
					a.splice(i, 0, changedName);
					newPath = a.join('.');
					repairNode = getLatestSceneNodeBypath(newPath, node, true);
					if(repairNode === oldRef) {
						break;
					}
				}
			}
		}
		if(repairNode === oldRef) {
			pathes[j] = newPath;
			atLeastOnePartFixed = true;
		} else {
			return;
		}
	}
	assert(atLeastOnePartFixed, "Path fixing error.");

	//apply fixed path
	
	let finalPath = pathes.shift();
	if(pathes.length > 0) {
		finalPath += '`' + pathes.join(',');
	}

	let fn = fieldname.split(',');
	let keyframe;
	if(fn.length > 1) {
		//it is keyframe action
		for(let f of node._timelineData.f) {
			if(f.n === fn[1]) {
				let targetTime = parseInt(fn[2]);
				for(let kf of f.t) {
					if(kf.t == targetTime) {
						keyframe = kf;
						break;
					}
				}
				break;
			}
		}
	}
	
	if(keyframe) {
		keyframe.a = finalPath;
	} else {
		node[fieldname] = finalPath;
	}
	Lib.__invalidateSerializationCache(node);
	if(node instanceof MovieClip) {
		MovieClip.invalidateSerializeCache(node);
	}
	return true;

};


function _rememberPathReference(o) {
	let props = editor.enumObjectsProperties(o);
	let m = null;

	const rememberRef = (path, name) => {
		if(path) {
			let targetNodes = getLatestSceneNodesByComplexPath(path, o);

			if(!m) {
				m = {};
				refs.set(o, m);
			}
			m[name] = {targetNodes, path};
		}
	};
	for(let p of props) {
		if(p.type === 'data-path' || p.type === 'callback') {
			rememberRef(o[p.name], p.name);
		} else if(p.type === 'timeline') {
			let timeline = o[p.name];
			if(timeline) {
				for(let field of timeline.f) {
					for(let k of field.t) {
						if(k.a) {
							rememberRef(k.a, p.name + ',' + field.n + ',' + k.t);
						}
					}
				}
			}
		}
	}
}

const validateRefEntry = (m, o) => {
	if(o.parent) {
		for(let fieldname in m) {

			let item = m[fieldname];
			let path = item.path;
			let oldRefs = item.targetNodes;
			let currentRefs = getLatestSceneNodesByComplexPath(path, o);
			
			for(let i = 0; i < oldRefs.length; i++) {
				if(oldRefs[i] !== currentRefs[i]) {
					if(!tryToFixDataPath(o, fieldname, path, oldRefs, currentRefs)) {

						let oldRef = oldRefs[i];
						let currentRef = currentRefs[i];

						let was;
						if(oldRef instanceof DisplayObject) {
							was = R.sceneNode(oldRef);
						} else {
							was = '' + oldRef;
						}
						let become;
						if(currentRef instanceof DisplayObject) {
							become = R.sceneNode(currentRef);
						} else {
							become = '' + currentRef;
						}

						let pathParts = path.split(/[,|`]/);
						let splitter = '`';

						editor.ui.status.warn(R.span(null, 'Path reference (', pathParts.map((pathPart, partNum) => {
							let ret = ((oldRefs[partNum] !== currentRefs[partNum]) ? R.b : R.span)({key : partNum}, pathPart, partNum < (pathParts.length-1) ? splitter : undefined);
							splitter = ',';
							return ret;
						}) ,') is affected: Was: ', was, ' Become: ', become), 32016, o, fieldname);
					}
				}
			}
		}
	}
};



let refs;