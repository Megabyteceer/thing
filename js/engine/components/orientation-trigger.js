import Container from "./container.js";
import game from "../game.js";
import callByPath from "../utils/call-by-path.js";

/// #if EDITOR
let IGNORE_DIRECT_PROPS = false;
/// #endif

export default class OrientationTrigger extends Container {
	
	init() {
		super.init();
		this.applyOrientation();
	}
	
	applyOrientation() {
		this.__currentOrientationIsPortrait = game.isPortrait;
		if(game.isPortrait) {
			this.x = this.portraitX;
			this.y = this.portraitY;
			this['scale.x'] = this.portraitScaleX;
			this['scale.y'] = this.portraitScaleY;
			super.alpha = this.portraitAlpha;
			this.rotation = this.portraitR;
			if(this.onPortrait
				/// #if EDITOR
				&& (!game.__EDITOR_mode || this.onPortrait.startsWith('setValueByPath`') || this.__callInEditorMode)
			/// #endif
			) {
				callByPath(this.onPortrait, this);
			}
		} else {
			this.x = this.landscapeX;
			this.y = this.landscapeY;
			this['scale.x'] = this.landscapeScaleX;
			this['scale.y'] = this.landscapeScaleY;
			this.alpha = this.landscapeAlpha;
			this.rotation = this.landscapeR;
			if(this.onLandscape
				/// #if EDITOR
				&& (!game.__EDITOR_mode || this.onLandscape.startsWith('setValueByPath`') || this.__callInEditorMode)
			/// #endif
			) {
				callByPath(this.onLandscape, this);
			}
		}
		this.visible = (this.alpha > 0.015) && (Math.abs(this.scale.x) > 0.0015) && (Math.abs(this.scale.y) > 0.0015);
		
		
		/// #if EDITOR
		if(game.__EDITOR_mode) this.visible = true;
		/// #endif
	}
	
	update() {
		if(this.visible) {
			super.update();
		}
	}
	
	_onRenderResize() {
		/// #if EDITOR
		this.__currentOrientationIsPortrait = 0; // enforce to applyOrientation
		/// #endif
		
		if(this.__currentOrientationIsPortrait !== game.isPortrait) {
			this.applyOrientation();
		}
	}
	
	/// #if EDITOR

	__callIfValueByPathSetter(path) {
		if(path && path.startsWith('setValueByPath`')) {
			try {
				callByPath(path, this);
			} catch(er) {
				console.error(er);
			}
		}
	}

	set onPortrait(val) {
		this.__onPortrait = val;
		if(!IGNORE_DIRECT_PROPS) {
			this.__callIfValueByPathSetter(this.__onPortrait);
			if(!game.isPortrait) {
				let symbol = new Object();
				__getNodeExtendData(this).__orientationTriggerHelperId = symbol;
				setTimeout(() => {
					if(__getNodeExtendData(this).__orientationTriggerHelperId === symbol) {
						this.__callIfValueByPathSetter(this.__onLandscape);
					}
				}, 600);
			}
		}
	}

	get onPortrait() {
		return this.__onPortrait;
	}

	set onLandscape(val) {
		this.__onLandscape = val;
		if(!IGNORE_DIRECT_PROPS) {
			this.__callIfValueByPathSetter(this.__onLandscape);
			if(game.isPortrait) {
				let symbol = new Object();
				__getNodeExtendData(this).__orientationTriggerHelperId = symbol;
				setTimeout(() => {
					if(__getNodeExtendData(this).__orientationTriggerHelperId === symbol) {
						this.__callIfValueByPathSetter(this.__onPortrait);
					}
				}, 600);
			}
		}
	}

	get onLandscape() {
		return this.__onLandscape;
	}

	__EDITOR_onCreate() {
		setTimeout(() => {
			if(game.isPortrait) {
				this.landscapeX = this.portraitX;
				this.landscapeY = this.portraitY;
				this.landscapeScaleX = this.portraitScaleX;
				this.landscapeScaleY = this.portraitScaleY;
				super.landscapeAlpha = this.portraitAlpha;
				this.landscapeR = this.portraitR;
			} else {
				this.portraitX = this.landscapeX;
				this.portraitY = this.landscapeY;
				this.portraitScaleX = this.landscapeScaleX;
				this.portraitScaleY = this.landscapeScaleY;
				this.portraitAlpha = this.landscapeAlpha;
				this.portraitR = this.landscapeR;
			}
		}, 0);
	}

	set alpha(v) {
		super.alpha = v;
		if(IGNORE_DIRECT_PROPS) return;
		if(game.isPortrait) {
			this.portraitAlpha = v;
		} else {
			this.landscapeAlpha = v;
		}
	}

	get alpha() {
		if(IGNORE_DIRECT_PROPS) return super.alpha;
		if(game.isPortrait) {
			return super.alpha = isNaN(this.portraitAlpha) ? 1 : this.portraitAlpha;
		} else {
			return super.alpha =isNaN(this.landscapeAlpha) ? 1 :  this.landscapeAlpha;
		}
	}
	
	set x(v) {
		super.x = v;
		if(IGNORE_DIRECT_PROPS) return;
		if(game.isPortrait) {
			this.portraitX = v;
		} else {
			this.landscapeX = v;
		}
	}

	get x() {
		if(IGNORE_DIRECT_PROPS) return super.x;
		if(game.isPortrait) {
			return super.x = isNaN(this.portraitX) ? 0 : this.portraitX;
		} else {
			return super.x = isNaN(this.landscapeX) ? 0 : this.landscapeX;
		}
	}
	
	set rotation(v) {
		super.rotation = v;
		if(IGNORE_DIRECT_PROPS) return;
		if(game.isPortrait) {
			this.portraitR = v;
		} else {
			this.landscapeR = v;
		}
	}

	get rotation() {
		if(IGNORE_DIRECT_PROPS) return super.rotation;
		if(game.isPortrait) {
			return super.rotation = isNaN(this.portraitR) ? 0 : this.portraitR;
		} else {
			return super.rotation = isNaN(this.landscapeR) ? 0 : this.landscapeR;
		}
	}
	
	set y(v) {
		super.y = v;
		if(IGNORE_DIRECT_PROPS) return;
		if(game.isPortrait) {
			this.portraitY = v;
		} else {
			this.landscapeY = v;
		}
	}

	get y() {
		if(IGNORE_DIRECT_PROPS) return super.y;
		if(game.isPortrait) {
			return super.y = isNaN(this.portraitY) ? 0 : this.portraitY;
		} else {
			return super.y = isNaN(this.landscapeY) ? 0 : this.landscapeY;
		}
	}
	
	set "scale.x"(v) {
		super['scale.x'] = v;
		if(IGNORE_DIRECT_PROPS) return;
		if(game.isPortrait) {
			this.portraitScaleX = v;
		} else {
			this.landscapeScaleX = v;
		}
	}

	get "scale.x"() {
		if(IGNORE_DIRECT_PROPS) return super['scale.x'];
		if(game.isPortrait) {
			return super.scale.x = isNaN(this.portraitScaleX) ? 0 : this.portraitScaleX;
		} else {
			return super.scale.x = isNaN(this.landscapeScaleX) ? 0 : this.landscapeScaleX;
		}
	}
	
	set "scale.y"(v) {
		super['scale.y'] = v;
		if(IGNORE_DIRECT_PROPS) return;
		if(game.isPortrait) {
			this.portraitScaleY = v;
		} else {
			this.landscapeScaleY = v;
		}
	}

	get "scale.y"() {
		if(IGNORE_DIRECT_PROPS) return super['scale.y'];
		if(game.isPortrait) {
			return super.scale.y =  isNaN(this.portraitScaleY) ? 0 : this.portraitScaleY;
		} else {
			return super.scale.y =  isNaN(this.landscapeScaleY) ? 0 : this.landscapeScaleY;
		}
	}
	
	__beforeSerialization() {
		IGNORE_DIRECT_PROPS = true;
		this.x = 0;
		this.y = 0;
		this.rotation = 0;
		this.alpha = 1;
		this.scale.x = 1;
		this.scale.y = 1;
	}
	
	__afterSerialization() {
		IGNORE_DIRECT_PROPS = false;
		this.applyOrientation();
	}
	
	__beforeDeserialization() {
		IGNORE_DIRECT_PROPS = true;
	}
	
	__afterDeserialization() {
		if(game.projectDesc.screenOrientation !== 'auto') {
			editor.ui.status.warn("Orientation trigger is not useful if projects screenOrientation is not set to 'auto'", 32023, this);
		}
		IGNORE_DIRECT_PROPS = false;
		this.applyOrientation();
	}

	__shiftObject(dx, dy) {
		super.x += dx;
		super.y += dy;
		this.landscapeX += dx;
		this.portraitX += dx;
		this.landscapeY += dy;
		this.portraitY += dy;
	}

	static __beforeChangeToThisType(o) {
		o.landscapeX = o.portraitX = o.x;
		o.landscapeY = o.portraitY = o.y;
		o.landscapeScaleX = o.portraitScaleX = o['scale.x'];
		o.landscapeScaleY = o.portraitScaleY = o['scale.y'];
		o.landscapeAlpha = o.portraitAlpha = o.alpha;
		o.landscapeR = o.portraitR = o.rotation;
	}

	/// #endif
}


/// #if EDITOR
OrientationTrigger.__EDITOR_group = 'Mobile';
OrientationTrigger.__EDITOR_icon = 'tree/orientation-trigger';
OrientationTrigger.__EDITOR_tip = `<b>OrientationTrigger</b> - is component which smoothly or instantly <b>switches</b> it's <b>visibility</b> or/and <b>position</b> and <b>scale</b> accordingly of <b>game.isPortrait</b> variable.
It's main distinguish from Trigger is that OrientationTrigger switches its state in edition time, so you can edit both states by push "Switch screen orientation button" in view port (Ctrl + O).
If OrientationTrigger become invisible because of alpha=0 or scale.x=0 or scale.y=0 it <b>stops</b> to <b>update</b> its children.`;

const propDisabler = () => {return true;};

__EDITOR_editableProps(OrientationTrigger, [
	{
		type: 'splitter',
		title: 'OrientationTrigger:',
		name: 'trigger'
	},
	{
		type: 'callback',
		name: 'onPortrait'
	},
	{
		type: 'callback',
		name: 'onLandscape'
	},
	{
		type:Boolean,
		name:'__callInEditorMode'
	},
	{
		type: 'btn',
		title: 'Centralize to content',
		name: 'Centralize',
		onClick: (o) => {editor.centralizeObjectToContent(o);}
	},
	{
		name: 'landscapeX',
		type: Number,
		disabled:propDisabler
	},
	{
		name: 'landscapeY',
		type: Number,
		disabled:propDisabler
	},
	{
		name: 'landscapeAlpha',
		type: Number,
		default:1,
		disabled:propDisabler
	},
	{
		name: 'landscapeScaleX',
		type: Number,
		default:1,
		disabled:propDisabler
	},
	{
		name: 'landscapeScaleY',
		type: Number,
		default:1,
		disabled:propDisabler
	},
	{
		name: 'landscapeR',
		type: Number,
		disabled:propDisabler
	},
	{
		name: 'portraitX',
		type: Number,
		disabled:propDisabler
	},
	{
		name: 'portraitY',
		type: Number,
		disabled:propDisabler
	},
	{
		name: 'portraitAlpha',
		type: Number,
		default:1,
		disabled:propDisabler
	},
	{
		name: 'portraitScaleY',
		type: Number,
		default:1,
		disabled:propDisabler
	},
	{
		name: 'portraitScaleX',
		type: Number,
		default:1,
		disabled:propDisabler
	},
	{
		name: 'portraitR',
		type: Number,
		disabled:propDisabler
	}
]);

/// #endif

