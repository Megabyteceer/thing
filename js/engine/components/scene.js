import DisplayObject from "./display-object.js";
import Container from "./container.js";
import game from "../game.js";

export default class Scene extends Container {
	constructor() {
		super();
		this.backgroundColor = 0;
	}

	get name() {
		return this.__libSceneName;
	}

	onShow() {
		
	}
	
	onHide() {
		
	}

	onMouseDown(gameMouse, pixiEvent) { //eslint-disable-line no-unused-vars

	}

	onMouseMove(gameMouse, pixiEvent) { //eslint-disable-line no-unused-vars
		
	}

	onMouseUp(gameMouse, pixiEvent) { //eslint-disable-line no-unused-vars
		
	}
	
	init() {
		super.init();
		this._refreshAllObjectRefs();
		game.__savedCurrentSceneForInitTime = game.currentScene;
		game._setCurrentScene(this);
	}

	_refreshAllObjectRefs() { //shortcut to access to scene's children by name without iterate through hierarchy
		this.all = {};
			
		/// #if EDITOR
		addAllRefsValidator(this);
		/// #endif
		
		allObjectToRefresh = this.all;
		
		this.forAllChildren(_refreshChildRef);
		if(game.currentScene === this) {
			game.all = this.all;
		}
	}
	/// #if EDITOR
	__afterDeserialization() {
		if(!game.__EDITOR_mode) {
			this.all =ACCES__ALL_ASSERTING_PROXY;
		} else {
			this.all = undefined;
		}
		if(game.currentScene === this) {
			game.all = this.all;
		}
	}

	remove() { //allows editor to hide scene`s remove method and do not hide DisplayObject's remove method
		super.remove();
	}

	/// #endif
}

let allObjectToRefresh;
const _refreshChildRef = (o) => {
	if(o.name) {
		allObjectToRefresh[o.name] = o;
	}
};

/// #if EDITOR

const ACCES_ASSERTING_Func = () => {
	assert(false, 'Scene`s "all" object vas not initialized yet. You can not use "all" before call super.init().', 10017);
};
const ACCES__ALL_ASSERTING_PROXY = new Proxy({}, {
	get:ACCES_ASSERTING_Func,
	set:ACCES_ASSERTING_Func
});

Scene.prototype.remove.___EDITOR_isHiddenForChooser = true;
let validatorCounter = 0;
function addAllRefsValidator(scene) {
	let refsCounter = {};
	let deletionValidator = validatorCounter++;
	
	scene.all = new Proxy(scene.all, {
		get:(target, prop) => {
			if(prop === '___EDITOR_isGoodForChooser') {
				return true;
			} else if(prop === '___EDITOR_ChooserOrder') {
				return 100000;
			} 
			let ret = target[prop];
			if(!game.__EDITOR_mode && prop !== 'hasOwnProperty') {
				let refsWithThanNameCount = refsCounter[prop];
				assert(ret, "Attempt to access to scene object 'all." + prop + "'. Reference is empty: " + ret, 10018);
				assert((ret instanceof DisplayObject) && (!refsWithThanNameCount || refsWithThanNameCount === 1), "Attempt to access to object 'all." + prop + "'. But " + refsWithThanNameCount + " object with that name present on scene " + scene.name + "(" + scene.constructor.name + ").", 10019);
				assert(__getNodeExtendData(ret).__allRefsDeletionValidator === deletionValidator, "Attempt to access to scene object 'all." + prop + "'. Reference to object is presents, but this object was removed from scene already. Use 'all' path only for objects which never deleted from scene.", 10020);
			}
			return ret;
		},
		set:(target, prop, val) => {
			__getNodeExtendData(val).__allRefsDeletionValidator = deletionValidator;
			let count = refsCounter[prop] || 0;
			if(!count) {
				target[prop] = val;
			}
			refsCounter[prop] = count + 1;
			return true;
		}
	});
}

Scene.__EDITOR_icon = 'tree/scene';

__EDITOR_editableProps(Scene, [
	{
		type: 'splitter',
		title: 'Scene:',
		name: 'scene'
	},
	{
		name: 'name',
		type: String,
		notSerializable: true,
		override: true
	},
	{
		name: 'isStatic',
		type: Boolean,
		tip: `Set <b>true</b> if <b>scene should not be destroyed after it once created.</b>
		When you leave 'static' scene and then enter it again, engine uses same scene's instance each time without destroying it.
May be useful for Storage or Inventory scenes where you should keep state of UI tabs and scroll lists on each entering.`
	},
	{
		name: 'isNoStackable',
		type: Boolean,
		tip: `Set <b>true</b> for <b>prevent storing this scene in scenes stack</b>.
Useful for "cut scenes" and "message scenes" which should be shown only once before entering to some another scene.`
	},
	{
		name: 'backgroundColor',
		type: 'color'
	},
	{
		name: 'faderType',
		type: String,
		select:window.makePrefabSelector('fader/', true)
	}
]);

/// #endif