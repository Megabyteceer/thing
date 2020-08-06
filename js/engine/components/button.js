/// #if EDITOR
import getValueByPath from "../utils/get-value-by-path.js";
/// #endif

import game from "../game.js";
import callByPath from "../utils/call-by-path.js";
import DSprite from "./d-sprite.js";
import Sound from "../utils/sound.js";
import Lib from "../lib.js";

let latestClickTime;

export default class Button extends DSprite {
	
	init() {
		super.init();

		this.on('pointerdown', this.onDown);
		this.on('pointerup', this.onUp);
		this.on('pointerover', this.onOver);
		this.on('pointerout', this.onOut);

		assert(!game.__EDITOR_mode, "'init()' called in edition mode");
		assert(allActiveButtons.indexOf(this) < 0, "Button already in active list.");
		allActiveButtons.push(this);

		this.buttonMode = true;
		this.initialScale = this.scale.x;
		this.initialImage = this.image;
		if(this.interactive) {
			this.enable();	
		} else {
			this.disable();
		}
	}
	
	onRemove() {
		super.onRemove();
		this.onOut();

		this.removeListener('pointerdown', this.onDown);
		this.removeListener('pointerup', this.onUp);
		this.removeListener('pointerover', this.onOver);
		this.removeListener('pointerout', this.onOut);

		assert(!game.__EDITOR_mode, "'destroy()' called in edition mode");
		let i = allActiveButtons.indexOf(this);
		assert(i >= 0, 'Button is not in active list.');
		allActiveButtons.splice(i, 1);
		if(downedByKeycodeButton === this) {
			downedByKeycodeButton = null;
		}
		this.initialImage = null;
		this.interactive = false;
		this.buttonMode = false;
		if(this.hasOwnProperty('callback')) {
			delete(this.callback);
		}
	}
	
	disable() {
		if(this.initialImage) {
			this.onUp();
			this.onOut();
			if(this.disabledImage) {
				this.image = this.disabledImage;
			} else {
				this.alpha = this.disabledAlpha;
			}
		}
		this.interactive = false;
	}
	
	enable() {
		if(this.initialImage) {
			if(this.disabledImage) {
				this.image = this.initialImage;
			} else {
				this.alpha = 1;
			}
		}
		this.interactive = true;
	}

	get isOvered() {
		return this === Button.overredButton;
	}

	get isDowned() {
		return this === Button.downedButton;
	}

	callClick() {
		if(this.isCanBePressed) {
			this._executeOnClick('invoke');
		}
	}

	_executeOnClick(source) {
		/// #if EDITOR
		if(game.__EDITOR_mode) {
			return;
		}
		/// #endif
		assert(this.isCanBePressed, "_executeOnClick called for button which could not be pressed at the moment.");
		
		if(Button.globalOnClick) { // 99999
			Button.globalOnClick(this, source);
		}

		Button.clickedButton = this;
		if(this.callback) {
			this.callback();
		}
		if(this.onClick) {
			callByPath(this.onClick, this);
		}
		if(this.afterClick) {
			callByPath(this.afterClick, this);
		}
		Button.clickedButton = null;
		if(this.sndClick) {
			Sound.play(this.sndClick);
		}
	}
	
	onDown(ev, source = 'pointerdown') {
		if(game.time === latestClickTime
		/// #if EDITOR
			&& !game.__paused
		/// #endif
		) {
			return;
		}
		latestClickTime = game.time;
		if(ev) {
			if(ev.data.buttons !== 1) {
				return;
			}
			game._mouseHandlerGlobal(ev);
		}
		if(this.isCanBePressed) {
			if(Button.downedButton !== this) {
				if(Button.downedButton) {
					Button.downedButton.onUp();
				}
				if (this.pressImage) {
					this.image = this.pressImage;
				} else {
					this.scale.x =
						this.scale.y = this.initialScale  * (this.isOvered ? 1 : 0.9);
				}
				Button.downedButton = this;
				this.curDelay = this.repeatDelay;
				this._executeOnClick(source);
			}
		}
	}
	
	update() {

		/// #if EDITOR
		if(this.isCanBePressed) {
			if(this.onClick) {
				if(typeof getValueByPath(this.onClick, this, true) !== 'function') {
					editor.ui.status.warn('Wrong onclick handler.', 99999, this, 'onClick');
				}
			}
			if(this.afterClick) {
				if(typeof getValueByPath(this.afterClick, this, true) !== 'function') {
					editor.ui.status.warn('Wrong afterClick handler.', 99999, this, 'afterClick');
				}
			}
		}

		/// #endif

		if(this.isDowned) {
			if(!game.mouse.click && (downedByKeycodeButton !== this)) {
				this.onUp();
			} else if(this.curDelay > 0) {
				this.curDelay--;
				if(this.curDelay === 0) {
					if(this.isCanBePressed) {
						this._executeOnClick('autorepeat');
					}
					this.curDelay = this.repeatInterval;
				}
			}
		}
		super.update();
	}
	
	onUp() {
		if(Button.downedButton === this) {
			if(this.interactive) {
				if(this.pressImage) {
					if(this.initialImage) {
						this.image = this.initialImage;
					}
				} else {
					this.scale.x =
						this.scale.y = this.initialScale * (this.isOvered ? 1.05 : 1);
				}
			}
			Button.downedButton = null;
		}
	}
	
	onOver() {
		if(game.isTouchscreen) return;
		if(Button.overredButton !== this) {
			if(Button.overredButton) {
				Button.overredButton.onOut();
			}
			Button.overredButton = this;
			if(this.hoverImage) {
				this.image = this.hoverImage;
			} else {
				this.scale.x =
						this.scale.y = this.initialScale * 1.05;
			}
			if(this.sndOver) {
				Sound.play(this.sndOver);
			}
			this.gotoLabelRecursive('btn-over');
		}
	}

	_onDisableByTrigger() {
		this.onOut();
	}
	
	onOut() {
		if(Button.overredButton === this) {
			Button.overredButton = null;
			if(this.interactive) {
				if(this.hoverImage) {
					if(this.initialImage) {
						this.image = this.initialImage;
					}
				} else {
					this.scale.x =
						this.scale.y = this.initialScale;
				}
			}
			this.onUp();
			this.gotoLabelRecursive('btn-out');
		}
	}

	static _tryToClickByKeycode(keyCode) {
		for(let b of allActiveButtons) {
			if((b.hotkey === keyCode) && b.isCanBePressed) {
				b.onDown(null, 'hotkey');
				return b;
			}
		}
	}

	/// #if EDITOR
	__EDITOR_onCreate() {
		if(Lib.hasTexture('ui/button.png') ) {
			this.image = 'ui/button.png';
		}
		if(Lib.hasSound('click') ) {
			this.sndClick = 'click';
		}
		if(Lib.hasSound('over') ) {
			this.sndOver = 'over';
		}
	}


	/// #endif

}

let downedByKeycodeButton;

let allActiveButtons = [];
window.addEventListener('keydown', (ev) => {
	if(ev.repeat) {
		return;
	}
	/// #if EDITOR
	if(game.__EDITOR_mode) {
		return;
	}
	/// #endif

	downedByKeycodeButton = Button._tryToClickByKeycode(ev.keyCode);
});

window.addEventListener('keyup', (ev) => {
	if(downedByKeycodeButton && downedByKeycodeButton.hotkey === ev.keyCode) {
		downedByKeycodeButton.onUp();
		downedByKeycodeButton = null;
	}
});

/// #if EDITOR
__EDITOR_editableProps(Button, [
	{
		type: 'splitter',
		title: 'button:',
		name: 'button'
	},
	window.makeImageSelectEditablePropertyDescriptor('hoverImage', true),
	window.makeImageSelectEditablePropertyDescriptor('pressImage', true),
	window.makeImageSelectEditablePropertyDescriptor('disabledImage', true),
	{
		name: 'disabledAlpha',
		visible: (o) => {
			return !o.disabledImage;
		},
		type: Number,
		min: 0,
		max: 1,
		step: 0.01,
		default: 0.76
	},
	{
		name: 'onClick',
		type: 'callback',
		important: true
	},
	{
		name: 'afterClick',
		type: 'callback'
	},
	{
		name: 'hotkey',
		type: Number
	},
	{
		type: String,
		select:window.makeSoundSelector(),
		name: 'sndClick',
		filterName:'sndSelector'
	},
	{
		type: String,
		select:window.makeSoundSelector(),
		name: 'sndOver',
		filterName:'sndSelector'
	},
	{
		name: 'repeatDelay',
		type: Number,
		min:0
	},
	{
		name: 'repeatInterval',
		type: Number,
		min: 0
	},
	{
		name: 'interactive',
		type: Boolean,
		default: true,
		override: true
	}
]);
Button.__EDITOR_group = 'Basic';
Button.__EDITOR_icon = 'tree/button';

Button.prototype.enable.___EDITOR_isGoodForCallbackChooser = true;
Button.prototype.disable.___EDITOR_isGoodForCallbackChooser = true;
Button.prototype.callClick.___EDITOR_isGoodForCallbackChooser = true;


/// #endif