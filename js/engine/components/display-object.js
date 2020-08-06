/*
this class is not exported as editable component which you can add to stage in visual editor. Just adding basic functionality to be editable for all descendant classes of PIXI.DisplayObject.
 */

import Lib from "../lib.js";
import game from "../game.js";

const DisplayObject = PIXI.DisplayObject;

DisplayObject.prototype.getGlobalRotation = function getGlobalRotation() {
	let ret = this.rotation;
	let p = this.parent;
	while (p && p !== game.stage) {
		ret += p.rotation;
		p = p.parent;
	}
	return ret;
};

DisplayObject.prototype.getScenePosition = function getScenePosition(resultPoint, skipUpdate = false) {
	return game.stage.toLocal(this, this.parent, resultPoint, skipUpdate);
};

DisplayObject.prototype.getRootContainer = function getRootContainer() {
	let p = this;
	while (p && (p.parent !== game.stage) && p.parent) {
		p = p.parent;
	}
	return p;
};

DisplayObject.prototype.detachFromParent = function detachFromParent() {
	if(this.parent) {
		this.parent.removeChild(this);
	}
};

DisplayObject.prototype.init = () => {
	/// #if EDITOR
	editor._root_initCalled = true;
	/// #endif
};

DisplayObject.prototype.onRemove = () => {
	/// #if EDITOR
	editor._root_onRemovedCalled = true;
	/// #endif
};

DisplayObject.prototype.remove = function remove() {
	Lib.destroyObjectAndChildren(this);
};

DisplayObject.prototype.findParentByType = function (classType) {
	assert(classType.prototype instanceof DisplayObject, "DisplayObject inherited class expected.", 10053);
	let p = this.parent;
	while (p && !(p instanceof classType)) {
		p = p.parent;
	}
	return p;
};

DisplayObject.prototype.findParentByName = function (name) {
	let p = this.parent;
	while (p && p.name !== name) {
		p = p.parent;
	}
	return p;
};

DisplayObject.prototype.addFilter = function addFilter(f) {
	if(!this.filters) {
		this.filters = [f];
	} else {
		this.filters.push(f);
	}
};

DisplayObject.prototype.removeFilter = function removeFilter(f) {
	let i = this.filters.indexOf(f);
	if(i >= 0) {
		this.filters.splice(i, 1);
	}
};

export default DisplayObject;

let appliedCoordXGetter;

function getCoordX() {
	return this.worldTransform.tx;
}
function getCoordY() {
	return this.worldTransform.ty;
}

DisplayObject.applyWorldCoordsGetters = () => {
	if(game._isCanvasRotated) {
		Object.defineProperties(DisplayObject.prototype, {
			'worldX': { // 99999
				get: getCoordY,
				configurable: true
			},
			'worldY': {
				get: getCoordX,
				configurable: true
			}
		});
	} else {
		Object.defineProperties(DisplayObject.prototype, {
			'worldX': {
				get: getCoordX,
				configurable: true
			},
			'worldY': {
				get: getCoordY,
				configurable: true
			}
		});
	}
};

Object.defineProperties(DisplayObject.prototype, {
	'___info': {
		get: function () {
			let ret = getObjectName(this);
			let p = this.parent;
			while(p && (p !== game.stage)) {
				ret += ' > ' + getObjectName(p);
				p = p.parent;
			}
			return ret;
		}
	},'scale.x': {
		get: function () {
			return this.transform.scale.x;
		},
		set: function (val) {
			this.transform.scale.x = val;
		}, configurable: true
	}, 'scale.y': {
		get: function () {
			return this.transform.scale.y;
		},
		set: function (val) {
			this.transform.scale.y = val;
		}, configurable: true
	},
	'skew.x': {
		get: function () {
			return this.transform.skew.x;
		},
		set: function (val) {
			this.transform.skew.x = val;
		}, configurable: true
	}, 'skew.y': {
		get: function () {
			return this.transform.skew.y;
		},
		set: function (val) {
			this.transform.skew.y = val;
		}, configurable: true
	},
	'pivot.x': {
		get: function () {
			return this.transform.pivot.x;
		},
		set: function (val) {
			this.transform.pivot.x = val;
		}, configurable: true
	}, 'pivot.y': {
		get: function () {
			return this.transform.pivot.y;
		},
		set: function (val) {
			this.transform.pivot.y = val;
		}, configurable: true
	}
});

/// #if EDITOR

const getObjectName = (o) => {
	return (o.name || ('(' + o.constructor.name + ')'));
};

DisplayObject.prototype.remove.___EDITOR_isGoodForChooser = true;

DisplayObject.prototype.__onSelect = function __onSelect() {
	let p = this.parent;
	while(p !== game.stage) {
		if(p.__onChildSelected) {
			p.__onChildSelected();
		}
		p = p.parent;
	}
};

DisplayObject.prototype.__EDITOR_inner_exitPreviewMode = function __EDITOR_inner_exitPreviewMode() {
	if(!this.__EDITOR_component_in_previewMode) return;
	editor.beforePropertyChanged.remove(this.__exitPreviewMode);
	this.__exitPreviewMode();
	this.__EDITOR_component_in_previewMode = false;
};

DisplayObject.prototype.__EDITOR_inner_goToPreviewMode = function __EDITOR_inner_goToPreviewMode() {
	if(this.__EDITOR_component_in_previewMode) return;
	editor.beforePropertyChanged.add(this.__exitPreviewMode);
	this.__goToPreviewMode();
	this.__EDITOR_component_in_previewMode = true;
};

__EDITOR_editableProps(DisplayObject, [
	{
		type: 'splitter',
		title: 'Basic props:',
		name: 'basic'
	},
	{
		name: 'name',
		type: String,
		parser:(name) => {
			return name && name.replace('.', '_').replace('#', '_').replace('`', '_').replace(',', '_');
		},
		disabled:(node) => {
			return node.parent === game.stage;
		},
		beforeEdited:(val) => {
			editor.DataPathFixer.beforeNameEdit(val);
		},
		onBlur:() => {
			editor.DataPathFixer.onNameBlur();
		},
		notAnimate: true
	},
	{
		name: 'x',
		type: Number
	},
	{
		name: 'y',
		type: Number
	},
	{
		name: 'rotation',
		type: Number,
		step: 0.001
	},
	{
		name: 'alpha',
		type: Number,
		step: 0.01,
		min: 0,
		max: 1,
		default: 1
	},
	{
		name: 'visible',
		type: Boolean,
		default: true
	},
	{
		name: 'interactive',
		type: Boolean,
		default: false
	},
	{
		name: '__lockSelection',
		type: Boolean,
		default: false
	},
	{
		name: '___id',
		type: Number,
		disabled: () => {
			return true;
		}
	},
	{
		type: 'splitter',
		title: 'Transform:',
		name: 'transform'
	},
	{
		name: 'scale.x',
		type: Number,
		step: 0.01,
		default: 1
	},
	{
		name: 'scale.y',
		type: Number,
		step: 0.01,
		default: 1
	},
	{
		name: 'skew.x',
		type: Number,
		step: 0.01
	},
	{
		name: 'skew.y',
		type: Number,
		step: 0.01
	},
	{
		name: 'pivot.x',
		type: Number
	},
	{
		name: 'pivot.y',
		type: Number
	}
]);

/// #endif
