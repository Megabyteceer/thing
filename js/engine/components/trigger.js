import Container from './container.js';
import getValueByPath from "../utils/get-value-by-path.js";
import callByPath from '../utils/call-by-path.js';
import game from '../game.js';

export default class Trigger extends Container {
	
	constructor() {
		super();
		this._removedChildren = [];
		/// #if EDITOR
		this.__exitPreviewMode = this.__exitPreviewMode.bind(this);
		/// #endif
	}
	
	init() {
		super.init();
		this.initialAlpha = this.alpha;
		this.initialScale = this.scale.x;
		this.initialX = this.x;
		this.initialY = this.y;
		this.qSpeed = 0;
		this.triggering = false;
		this._processedState = undefined;
		this.applyInstantly();
		this.lastUpdateTime = game.time;
	}
	
	getState() {
		return this.invert === (!getValueByPath(this.dataPath, this));
	}

	applyInstantly() {
		assert(!game.__EDITOR_mode, "applyInstantly could not be called in editor mode", 10024);
		if (this.dataPath) {
			this._state = this.getState();
		} else {
			this._state = this.invert;
		}
		if (this._state) {
			this.q = 0;
		} else {
			this.q = 1;
		}
		this.qSpeed = 0;
		this.updatePhase();
		this.interactiveChildren = this._state || (!this.isApplyInteractivity);
	}
	
	show() {
		this._state = true;
		this.interactiveChildren = true;
		this.triggering = true;
	}

	set state (val) {
		if(val) {
			this.show();
		} else {
			this.hide();
		}
	}
	
	get state () {
		return this._state;
	}
	
	hide() {
		this._state = false;
		if(this.isApplyInteractivity) {
			this.interactiveChildren = false;
		}
		this.triggering = true;
		this.forAllChildren(processOnDisable);
	}
	
	toggle() {
		if(this._state) {
			this.hide();
		} else {
			this.show();
		}
	}
	
	updatePhase() {
		let qTo = this._state ? 0 : 1;
		if((this.pow === 1) || ((Math.abs(qTo - this.q) < 0.002) && (Math.abs(this.qSpeed) < 0.002))) {
			this.triggering = false;
			this.q = qTo;
		} else {
			this.qSpeed += (qTo - this.q) * this.pow;
			this.qSpeed *= this.damp;
			this.q += this.qSpeed;
		}
		
		this.alpha = this.initialAlpha + this.q * this.alphaShift;
		
		if (this.scaleShift !== 0) {
			let s = this.initialScale + this.q * this.scaleShift;
			this.scale.x = s;
			this.scale.y = s;
		}
		this.visible = (this.alpha > 0.015) && (Math.abs(this.scale.x) > 0.0015);
		if(!this.visible && !this._state && ((this.initialAlpha + this.alphaShift) <=  0.015)) {
			this.triggering = false;
			this.q = qTo;
		}
		
		if (this.xShift !== 0) {
			this.x = this.initialX + this.q * this.xShift;
		}
		if (this.yShift !== 0) {
			this.y = this.initialY + this.q * this.yShift;
		}
	}
	
	update() {
		if (this.dataPath) {
			let s = this.getState();
			if(this._state !== s) {
				this.toggle();
			}
		}
		if(this.triggering) {
			this.updatePhase();
			if(!this._state && ((game.time - this.lastUpdateTime) > 1)) {
				this.applyInstantly();
			}
		}
		if(this.visible) {
			super.update();
		}
		if(this._processedState !== this._state) {
			this._processedState = this._state;
			if(this._processedState) {
				if(this.onEnable) {
					callByPath(this.onEnable, this);
				}
			} else {
				if(this.onDisable) {
					callByPath(this.onDisable, this);
				}
			}
		}
		this.lastUpdateTime = game.time;
	}
	/// #if EDITOR
	
	set "scale.x"(v) {
		super['scale.x'] = v;
		super['scale.y'] = v;
	}
	
	get "scale.x"() {
		return super['scale.x'];
	}
	
	set "scale.y"(v) {
		super['scale.x'] = v;
		super['scale.y'] = v;
	}
	
	get "scale.y"() {
		return super['scale.x'];
	}

	__checkInteractionWarning() {
		if(this.isApplyInteractivity && (this.alphaShift === 0) && ((this.scaleShift + this.scale.x) !== 0)) {
			editor.ui.status.warn("Trigger disables interaction without alpha or scale effect. If you want to keep object clickable uncheck 'isApplyInteractivity' property of trigger", 32030, this);
		}
	}

	__beforeSerialization() {
		if(this.__visibleInEditor) {
			this.__visibleInEditorSave = this.__visibleInEditor;
		}
		delete this.__visibleInEditor;
		this.__checkInteractionWarning();
	}

	__afterSerialization() {
		if(this.__visibleInEditorSave) {
			this.__visibleInEditor = this.__visibleInEditorSave;
			delete this.__visibleInEditorSave;
		}
	}

	__afterDeserialization() {
		this.__checkInteractionWarning();
	}
	
	__goToPreviewMode() {
		this.initialAlpha = this.alpha;
		this.initialScale = this.scale.x;
		this.initialX = this.x;
		this.initialY = this.y;
		
		this.alpha += this.alphaShift;
		this['scale.x'] += this.scaleShift;
		this.x += this.xShift;
		this.y += this.yShift;
		
	}
	
	__exitPreviewMode() {
		this.alpha = this.initialAlpha;
		this['scale.x'] = this.initialScale;
		this.x = this.initialX;
		this.y = this.initialY;
	}

	__onSelect() {
		super.__onSelect();
		this.__onChildSelected();
	}

	__onChildSelected() {
		if(!this._visible && game.__EDITOR_mode) {
			this.__visibleInEditor = true;
			if(visibleEnabledTriggers.indexOf(this) < 0) {
				visibleEnabledTriggers.push(this);
			}
		}
	}

	get visible() {
		return this.__visibleInEditor || this._visible;
	}

	set visible(v) {
		delete this.__visibleInEditor;
		this._visible = v;
	}
		
/// #endif
}

const processOnDisable = (o) => {
	if(o._onDisableByTrigger) {
		o._onDisableByTrigger();
	}
};

/// #if EDITOR

Trigger.prototype.show.___EDITOR_isGoodForCallbackChooser = true;
Trigger.prototype.hide.___EDITOR_isGoodForCallbackChooser = true;
Trigger.prototype.toggle.___EDITOR_isGoodForCallbackChooser = true;

Trigger.__EDITOR_group = 'Extended';
__EDITOR_editableProps(Trigger, [
	{
		type: 'splitter',
		title: 'Trigger:',
		name: 'trigger'
	},
	{
		type: 'btn',
		title: 'Centralize to content',
		name: 'Centralize',
		onClick: (o) => {editor.centralizeObjectToContent(o);}
	},
	{
		name: 'state',
		type: Boolean
	},
	{
		name: 'dataPath',
		type: 'data-path',
		important: true,
		tip: `Contains string path to javascript variable to get value from.
As example path can be: <b>game.stage.height</b> or <b>this.parent.name</b>.
Supports <b>game</b>, <b>this</b> or Component's class name as root object.
Use '#' to access to child scene nodes by name: <b>game.currentScene.#myChildElementsName.x</b>.`
	},
	{
		name: 'invert',
		type: Boolean
	},
	window.makePreviewModeButton('Preview switched', 'components.Trigger#preview-switched'),
	{
		name: 'pow',
		type: Number,
		step: 0.001,
		min:0.001,
		max:1,
		default: 0.02,
		tip:'Speed of state switching. Set it to <b>1.0</b> for instant switching.'
	},
	{
		name: 'damp',
		type: Number,
		step: 0.001,
		min:0.001,
		max:0.999,
		default: 0.85,
		tip:'Resistance for switching.'
	},
	{
		name: 'preset',
		type: 'pow-damp-preset',
		notSerializable: true
	},
	{
		name: 'alphaShift',
		type: Number,
		step: 0.01,
		min:-1,
		max:0,
		default: -1
	},
	{
		name: 'scaleShift',
		type: Number,
		step: 0.01,
		min:-1
	},
	{
		name: 'xShift',
		type: Number
	},
	{
		name: 'yShift',
		type: Number
	},
	{
		name: 'isApplyInteractivity',
		type: Boolean,
		default:true
	},
	{
		name: 'onEnable',
		type: 'callback'
	},
	{
		name: 'onDisable',
		type: 'callback'
	}
]);

Trigger.__EDITOR_icon = 'tree/trigger';

Trigger.__EDITOR_tip = `<b>Trigger</b> - is component which smoothly or instantly <b>switches</b> it's <b>visibility</b> or/and <b>position</b> accordingly of value of specified javaScript variable.
If trigger become invisible because of alpha=0 or scale.x=0 or scale.y=0 it <b>stops</b> to <b>update</b> its children.`;


let visibleEnabledTriggers = [];
setInterval(() => {
	for(let i = visibleEnabledTriggers.length - 1; i >= 0; i--) {
		let t = visibleEnabledTriggers[i];
		if(!t.__isAnyChildSelected()) {
			delete t.__visibleInEditor;
			visibleEnabledTriggers.splice(i, 1);
		}
	}
}, 1000);

/// #endif