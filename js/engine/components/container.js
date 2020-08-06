import MovieClip from "./movie-clip/movie-clip.js";
import game from "../game.js";
import DisplayObject from "./display-object.js";
const Container = PIXI.Container;

Container.prototype.update = function update() {
	for (let c of this.children) {
		c.update();
	}
};

Container.prototype.init = () => {
	/// #if EDITOR
	editor._root_initCalled = true;
	/// #endif
};

Container.prototype.onRemove = () => {
	/// #if EDITOR
	editor._root_onRemovedCalled = true;
	/// #endif
};

Container.prototype.findChildByName = function findChildByName(name) {
	assert(name, 'Empty name received.', 10005);
	let stack = [this];
	while (stack.length > 0) {
		if (stack.length > 1000) throw new Error('overflow');
		let o = stack.pop();
		let children = o.children;
		let len = children.length;
		for (let i =  0; i < len; i++) {
			o = children[i];
			if(o.name === name) {
				/// #if DEBUG
				o.name = '';
				let double = this.findChildByName(name);
				o.name = name;
				assert(!double, 'More that one element with name "' + name + '" exists.', 10006);
				/// #endif
				return o;
			}
			if (o.children.length > 0) {
				stack.push(o);
			}
		}
	}
	return null;
};

let findByTypeRet;
let findByTypeClass;

const _findByTypeInner = (o) => {
	if(o instanceof findByTypeClass) {
		findByTypeRet.push(o);
	}
};

/// #if DEBUG
Container.prototype.getChildByName = function(name) {
	let ret;
	for(let c of this.children) {
		if(c.name === name) {
			if(ret) {
				editor.ui.status.error("getChildByName called, but more that one object with name '"+ name + "' present in container " + this.___info, 10052, ret);
				return undefined;
			}
			ret = c;
		}
	}
	return ret;
};

/// #endif

Container.prototype.findChildrenByType = function (classType) {
	assert(classType.prototype instanceof DisplayObject, "DisplayObject inherited class expected.", 10053);
	findByTypeClass = classType;
	findByTypeRet = [];
	this.forAllChildren(_findByTypeInner);
	return findByTypeRet;
};

let findByNameName;

const _findByNameInner = (o) => {
	if(o.name === findByNameName) {
		findByTypeRet.push(o);
	}
};
Container.prototype.findChildrenByName = function (name) {
	assert(name, "Name expected", 10054);
	findByNameName = name;
	findByTypeRet = [];
	this.forAllChildren(_findByNameInner);
	return findByTypeRet;
};

assert(!Container.prototype.forAllChildren, "forAllChildren method needs renaming, because of PIXI changes.");

Container.prototype.forAllChildren = function (callback) {
	for (let o of this.children) {
		callback(o);
		o.forAllChildren(callback);
	}
};


Object.defineProperty(Container.prototype, 'isCanBePressed', {
	get:function() {
		if (!this.interactive || game.disableAllButtons) return false;
		let p = this.parent;
		while (p !== game.stage && p.interactiveChildren && p.visible) {
			p = p.parent;
		}
		return p.interactiveChildren && p.visible;
	},
	enumerable:true
});

Container.prototype.gotoLabelRecursive = function (labelName) {
	if(this instanceof MovieClip) {
		if (this.hasLabel(labelName)) {
			this.delay = 0;
			this.gotoLabel(labelName);
		}
	}
	for(let c of this.children) {
		c.gotoLabelRecursive(labelName);
	}
};

export default Container;

/// #if EDITOR

Container.prototype.gotoLabelRecursive.___EDITOR_callbackParameterChooserFunction = (context) => {
	
	return new Promise((resolve) => {
		let movieClips = context.findChildrenByType(MovieClip);
		if(context instanceof MovieClip) {
			movieClips.push(context);
		}

		let addedLabels = {};

		const CUSTOM_LABEL_ITEM = {name: 'Custom label...'};

		let labels = [];
		movieClips.forEach((m) => {
			if(m.timeline) {
				for(let name in m.timeline.l) {
					if(!addedLabels[name]) {
						labels.push({name: R.b(null, name), pureName: name});
						addedLabels[name] = true;
					}
				}
			}
		});

		labels.push(CUSTOM_LABEL_ITEM);

		return editor.ui.modal.showListChoose("Choose label to go recursive", labels).then((choosed) => {
			if(choosed) {
				if(choosed === CUSTOM_LABEL_ITEM) {
					editor.ui.modal.showPrompt('Enter value', '').then((enteredText) => {
						resolve([enteredText]);
					});
				} else {
					resolve([choosed.pureName]);
				}
			}
			return null;
		});



		

	});
};


DisplayObject.prototype.__isAnyChildSelected = function __onSelect() {
	for(let o of editor.selection) {
		while(o) {
			if(o === this) {
				return true;
			}
			o = o.parent;
		}
	}
};

Container.prototype.gotoLabelRecursive.___EDITOR_isGoodForCallbackChooser = true;
Container.prototype.destroy.___EDITOR_isHiddenForChooser = true;
Container.__EDITOR_icon = 'tree/container';
Container.__EDITOR_group = 'Basic';
/// #endif