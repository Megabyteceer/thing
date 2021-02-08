import PropsFieldWrapper from "./props-field-wrapper.js";
import DisplayObject from "thing-editor/js/engine/components/display-object.js";
import game from "thing-editor/js/engine/game.js";
import CallbackEditor from "./callback-editor.js";
import getValueByPath, {getLatestSceneNodeBypath} from "thing-editor/js/engine/utils/get-value-by-path.js";
import PrefabsList from "../prefabs-list.js";
import Lib from "thing-editor/js/engine/lib.js";
import callByPath from "thing-editor/js/engine/utils/call-by-path.js";

const fieldEditorWrapperProps = {className:"field-editor-wrapper"};
const selectableSceneNodeProps = {className:"selectable-scene-node"};
const functionTipProps = {className:"path-editor-function-tip"};
const functionTipWrapperProps = {className:"path-editor-function-tip-wrapper"};

let initialized = false;

export default class DataPathEditor extends React.Component {
	
	constructor(props) {
		super(props);
		if(this.props.field) {
			this.props.field.notAnimate = true;
		}
		this.onEditClicked = this.onEditClicked.bind(this);
		this.onBreakpointClick = this.onBreakpointClick.bind(this);
		this.onGotoTargetClick = this.onGotoTargetClick.bind(this);
		this.onFocus = this.onFocus.bind(this);
		this.onBlur = this.onBlur.bind(this);
	}

	onFocus() {
		this.setState({focus: true});
	}

	onBlur() {
		this.setState({focus: false});
	}

	static isFunctionIsClass(f) {
		return f.name && (f.name[0] !== f.name.toLowerCase()[0]);
	}

	onGotoTargetClick() {

		if(this.props.value && this.props.value.startsWith('Sound.play')) {
			callByPath(this.props.value, editor.selection[0]);
			return;
		}

		game.currentScene._refreshAllObjectRefs();
		let node = getLatestSceneNodeBypath(this.props.value, editor.selection[0]);
		if(!node) {
			return;
		}
		if(node.getRootContainer() !== game.currentContainer) {
			PrefabsList.exitPrefabEdit();
		}
		
		if(node.getRootContainer() !== game.currentContainer) {
			editor.ui.modal.notify('Target object is not in current container to be selected.');
		} else {
			editor.ui.sceneTree.selectInTree(node);
		}
	}
	
	onBreakpointClick() {
		let node = editor.selection[0];
		node.___pathBreakpoint = this.props.value || node[this.props.field.name];
	}

	onEditClicked() {
		if(!this.props.disabled) {
			if(!initialized) {
				initSelectableProps();
				initialized = true;
			}
			this.fieldNameToChoose = this.props.title || this.props.field.name;
			path = this.props.value;
			path = this.prepareCurrentPath(path);
			game.currentScene._refreshAllObjectRefs();
			
			this.chooseProperty(null);
		}
	}
	
	prepareCurrentPath(path) {
		return path;
	}
	
	isItTargetValue(val) {
		if(this.props.field.isValueValid && !this.props.field.isValueValid(val)) {
			return false;
		}

		if (!val) return true;

		let type = typeof val;
		
		return ((type !== 'object') && (type !== 'function' || !CallbackEditor.isFunctionIsClass(val)));
	}
	
	finalValueChoosed(path) {
		this.applyFinalPath(path.join('.'));
	}
	
	applyFinalPath(path) {
		this.props.onChange(PropsFieldWrapper.surrogateChangeEvent(path));
		editor.scheduleHistorySave();
	}
	
	isFieldGoodForCallbackChoose(fieldName, object, val, isChild) {
		editor.rememberTryTime();
		try {
			if(fieldName.charCodeAt(0) === 95) {
				return false;
			}
			if(typeof val === 'undefined') {
				val = object[fieldName];
			}
			if(!val) {
				return true;
			}
			let type = typeof val;
			if(type === 'object' || (type === 'function')) {
				
				if(isChild && val instanceof DisplayObject && __getNodeExtendData(val).hidden) return false;
				
				return !val.hasOwnProperty('___EDITOR_isHiddenForChooser')  &&
					(this.itIsCallbackEditor || !val.hasOwnProperty('___EDITOR_isHiddenForDataChooser'));
			}
			
			return true;
		} catch (er) {
			editor.checkTryTime();
		}
	}
	
	render() {

		let val = this.props.value;

		let breakpointBtn;
		if(val && !game.__EDITOR_mode) {
			breakpointBtn = R.btn('■', this.onBreakpointClick, 'Breakpoint', 'tool-btn breakpoint-btn');
		}
		let chooseBtn;
		if(game.__EDITOR_mode) {
			chooseBtn = R.btn('...', this.onEditClicked, 'Start data source choosing', 'tool-btn');
		}

		let gotoButton;
		if(val) {
			gotoButton = R.btn('🡒', this.onGotoTargetClick, 'Find target object', 'tool-btn' );
		}

		let functionTip;
		if(val && this.state && this.state.focus) {
			game.currentScene._refreshAllObjectRefs();
			let f;
			try {
				f = getValueByPath(val, editor.selection[0], true);
			} catch (er) {}// eslint-disable-line no-empty

			if(typeof f === 'function') {
				let firstLine = f.toString().split('\n').shift();
				let params = firstLine.split('(').pop().split(')').shift();
				if(!params) {
					params = 'no parameters';
				}
				functionTip = R.span(functionTipWrapperProps, R.span(functionTipProps, params));
			}
		}

		return R.div(fieldEditorWrapperProps,
			R.input({
				className:'props-editor-callback',
				onChange: this.props.onChange,
				disabled: this.props.disabled,
				title:val,
				value: val || '',
				onFocus: this.onFocus,
				onBlur: this.onBlur
			}),
			breakpointBtn,
			chooseBtn,
			gotoButton,
			functionTip
		);
	}

	chooseProperty(parent) {

		let addedNames ={};
		let items = [];
		const addSceneNodeIfValid = (o, name, isChild, order = 100000) => {
			if(o && (o instanceof DisplayObject) && this.isFieldGoodForCallbackChoose(name, parent, o, isChild)) {
				let item = {order, pureName: name, name: R.fragment(R.b(null, name + ' '), R.div(selectableSceneNodeProps, R.sceneNode(o)))};
				
				if(isChild) {
					item.child = name;
				} else {
					item.pureName = name;
				}
				items.push(item);
				addedNames[name] = true;
				return true;
			}
		};

		if(!parent) {
			parent = game;
			_rootParent = parent;
			if(path && typeof path === 'string') { //restore current path as default value
				parentsPath = [];
				path = path.split('.');
				let pathI;
				for(pathI = 0; (pathI < path.length-1); pathI++) {
					let itemName = path[pathI];
					let p;
					if((itemName === 'this') && (pathI === 0)) {
						p = editor.selection[0];
					} else if(itemName.startsWith('#')) {
						p = parent.getChildByName(itemName.substr(1));
					} else {
						p = parent[itemName];
					}
					
					if(p) {
						parentsPath.push(parent);
						parent = p;
					} else {
						break;
					}
				}
				path.length = pathI;
			} else {
				parentsPath = [parent];
				path = [];
			}
		}
		
		if(path.length === 0) {
			addSceneNodeIfValid(editor.selection[0], 'this', false, 1000000);
		}


		//ignore names globally
		addedNames['constructor'] = true;
		addedNames['prototype'] = true;
		addedNames['tempDisplayObjectParent'] = true;
		if(parent instanceof DisplayObject) {
			addedNames['init'] = true;
			addedNames['update'] = true;
			addedNames['onRemove'] = true;
		}
		let topPathElement = path[path.length - 1];
		if(topPathElement && topPathElement.startsWith('#')) {
			addedNames['parent'] = true; // prevent to go from parent to child and back
		}

		if(path.length > 0) {
			items.push(BACK_ITEM);
		}

		
		if(parent.hasOwnProperty('parent') && !addedNames.hasOwnProperty('parent')) {
			addSceneNodeIfValid(parent.parent, 'parent');
		}
		
		if(parent.hasOwnProperty('children') && Array.isArray(parent.children)) {
			for(let child of parent.children) {
				if(child.name) {
					addSceneNodeIfValid(child, child.name, true);
				}
			}
		}

		const addIfGood = (name) => {
			if (!addedNames.hasOwnProperty(name)) {
				Lib.__outdatedReferencesDetectionDisabled = true;
				if (this.isFieldGoodForCallbackChoose(name, parent)) {
					if(!addSceneNodeIfValid(parent[name], name)) {
						let order = 0;
						let isBold;
						editor.rememberTryTime();
						try {
							let val = parent[name];
							order = val.___EDITOR_ChooserOrder || 0;
							if(val.___EDITOR_isGoodForChooser || (this.itIsCallbackEditor && val.___EDITOR_isGoodForCallbackChooser) || val === game.data) {
								order += 100;
								isBold = true;
							}
						} catch(er) {// eslin t-disable-line no-empty
							editor.checkTryTime();
						}
						if(!isBold) {
							items.push({name});
						} else {
							items.push({pureName:name, name: R.b(null, name), order});
						}

						addedNames[name] = true;
					}
				}
				Lib.__outdatedReferencesDetectionDisabled = false;
			}
		};
		
		if(parent.constructor && !this.itIsCallbackEditor) {
			let props = editor.enumObjectsProperties(parent);
			if(props && Array.isArray(props)) {
				for(let p of props) {
					if(p.type !== 'splitter') {
						let name = p.name;
						items.push({pureName:name, name: R.b(null, name), order: 10000});
						addedNames[name] = true;
					}
				}
			}
		}


		let type = typeof parent;

		if(type === 'object' || type === 'function') {
			let props = enumProps(parent);
			if(parent !== _rootParent) {
				props.sort();
			}
			for(let name of props) {
				if(type === 'function') {
					if(name === 'length' || name === 'name') {
						continue;
					}
				}
				addIfGood(name);
			}
		}

		let acceptNowBtn;
		if(!this.props.field || !this.props.field.isValueValid || this.props.field.isValueValid(parent)) {
			acceptNowBtn = R.btn('✔', () => {
				this.finalValueChoosed(path, parent, parentsPath[parentsPath.length - 1]);
				editor.ui.modal.hideModal();
			}, 'Use this path', 'main-btn');
		}
		items.sort((a, b) => {
			return (b.order || 0) - (a.order || 0);
		});
		editor.ui.modal.showListChoose(R.span(null, 'Path for ' + this.fieldNameToChoose + ': ' + path.join('.') + '.', R.br(), (parent instanceof DisplayObject) ? R.sceneNode(parent) : undefined, acceptNowBtn),
			items).then((selected) => {
			if(selected) {
				let val;
				if(selected === BACK_ITEM) {
					path.pop();
					val = parentsPath.pop();
				} else if(selected.child) {
					path.push('#' + selected.child);
					parentsPath.push(parent);
					val = parent.getChildByName(selected.child);
				} else {
					let name = selected.pureName || selected.name;
					path.push(name);
					parentsPath.push(parent);
					if(name === 'this') {
						val = editor.selection[0];
					} else {
						val = parent[name];
					}
				}
				
				if(this.isItTargetValue(val)) {
					this.finalValueChoosed(path, val, parent);
				} else {
					this.chooseProperty(val, path);
				}
			}
		});
	}
}

function initSelectableProps() {
	let tmpSprite = new PIXI.Sprite();
	let spriteProps = enumProps(tmpSprite);
	for(let p of spriteProps) {
		if(!p.startsWith('_')) {
			let v = tmpSprite[p];
			if((typeof v) === 'function') {
				hidePropertyFromEnumerationForChooser(v);
			}
		}
	}
	unhidePropertyFromEnumerationForChooser(tmpSprite.remove);
	unhidePropertyFromEnumerationForChooser(tmpSprite.gotoLabelRecursive);
}

let path;
const BACK_ITEM = {name:'↰', noFilter:true, order: 10000000};
let parentsPath;

let enumed;

const hiddenProps = new WeakMap();

const hidePropertyFromEnumerationForChooser = (p) => {
	hiddenProps.set(p, true);
};
const unhidePropertyFromEnumerationForChooser = (p) => {
	hiddenProps.delete(p);
};

const enumSub = (o) => {
	let op = Object.getOwnPropertyNames(o);
	for (let name of op) {
		if(!name.startsWith('_')) {
			editor.rememberTryTime();
			try {
				if(hiddenProps.has(o[name])) {
					continue;
				}
			} catch (er) { // eslint-disable-line
				editor.checkTryTime();
			}

			if (enumed.indexOf(name) === -1) {
				enumed.push(name);
			}
		}
	}
};

let _rootParent;

function enumProps(o) {
	Lib.__outdatedReferencesDetectionDisabled = true;
	enumed = [];
	enumSub(o);
	let cc = o.constructor;
	for (; cc && (cc !== Function) && (cc !== Object); (cc = cc.__proto__)) {
		let p = cc.prototype;
		if(p) {
			enumSub(p);
		}
	}
	Lib.__outdatedReferencesDetectionDisabled = false;
	return enumed;
}

	