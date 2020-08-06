import Lib from "../lib.js";
import game from "../game.js";
import callByPath from "../utils/call-by-path.js";

export default class TextInput extends PIXI.Text {

	init() {
		super.init();
		this.cursorObject = this.findChildByName('cursor');
	}

	onRemove() {
		super.onRemove();
		this.blurInput();
	}

	blurInput() {
		if(this.isFocused) {
			this.htmlInput.blur();
		}
	}

	get isFocused() {
		return this.htmlInput && (this.htmlInput === window.document.activeElement);
	}

	_onDisableByTrigger() {
		this.blurInput();
	}

	filterText(txt) {
		if(this.inputType === 'number') {
			return txt.replace(',', '.').replace(/[^0-9\.]/gm, '');
		}
		return txt;
	}

	update() {
		if(this.htmlInput) {
			let t = this.text;

			if(t != this.htmlInput.value) {
				let val = this.filterText(this.htmlInput.value);
				this.htmlInput.value = val;
				this.text = val;
				if(this.inputType !== 'number') {
					this.htmlInput.selectionEnd = this.htmlInput.selectionStart = this.htmlInput.value.length;
				}
				if(this.onChange) {
					callByPath(this.onChange, this);
				}
			}

			if(!this.worldVisible || (this.worldAlpha < 0.01)) {
				this.blurInput();
			}
		}
		if(this.cursorObject) {
			this.cursorObject.x = (this.style.align === 'center') ? this.texture.width / 2 : this.texture.width;
			this.cursorObject.visible = this.isFocused;
		}
		super.update();
	}

	set text(v) {
		if(this.maxInputLen) {
			v = v.substr(0, this.maxInputLen);
		}
		super.text = v;
		if(this.htmlInput) {
			this.htmlInput.value = this.filterText(v);
		}
	}

	get text() {
		return super.text;
	}

	get isEmpty () {
		return !this.text.trim();
	}
	
	focus() {
		game.addOnClickOnce((ev) => {
			if(!this.htmlInput) {
				this.htmlInput = document.createElement('input');
				this.htmlInput.style.opacity = 0;
				if (this.inputType === 'number') {
					this.htmlInput.pattern = '\d*';
				}
				this.htmlInput.style.position = "absolute";
				this.htmlInput.style.pointerEvents = 'none';
				this.htmlInput.addEventListener('keydown', (ev) => {
					if(ev.keyCode === 13) {
						this.blurInput();
					}
				});
				document.body.appendChild(this.htmlInput);
			}
			this.htmlInput.value = this.filterText(this.text);
			this.htmlInput.focus();
			ev.stopPropagation();
			ev.preventDefault();
		});
	}

	static prompt(title, message, defaultValue ='', maxLen=16, yesLabel, onYes = null, noLabel = null, onNo = null, easyClose = true, prefab = 'ui/prompt') {
		assert(maxLen > 0, "maxLength should be > 0");
		TextInput.latestPromptText = undefined;
		if(Lib.hasPrefab(prefab)) {
			let input;
			let o = game.showQuestion(title, message,
				yesLabel, () => {
					TextInput.latestPromptText = input.text.trim();
					if(onYes) {
						onYes(TextInput.latestPromptText);
					}
				},
				noLabel, () => {
					if(onNo) {
						onNo();
					}
				},
				easyClose, prefab
			);
			input = o.findChildrenByType(TextInput)[0];
			input.text = defaultValue;
			input.maxInputLen = maxLen;
			input.focus();
			return o;
		} else {
			let txt = window.prompt(title, defaultValue) || '';
			txt = txt.trim();
			
			if(txt.length > maxLen) {
				txt = txt.substr(0, maxLen);
			}
			if(txt) {
				onYes(txt);
			} else if(onNo) {
				onNo();
			}
		}
	}
}


/// #if EDITOR

TextInput.__EDITOR_group = 'Extended';
TextInput.__EDITOR_icon = 'tree/text-input';
TextInput.__EDITOR_tip = `TextInput element needs it's method "focus" to be called via any button click, to take focus on mobile devices.`;

__EDITOR_editableProps(TextInput, [{
	type: 'splitter',
	title: 'TextInput:',
	name: 'TextInput'
},
{
	name: 'maxInputLen',
	type: Number,
	min: 0
},
{
	name: 'inputType',
	type: String,
	default: 'text',
	select: ['text', 'number', 'url', 'email'].map(i => ({value: i, name: i}))
},
{
	name: 'onChange',
	type: 'callback'
},
{
	type: 'ref',
	name: 'cursorObject'
}]);

TextInput.___EDITOR_isGoodForChooser = true;
TextInput.prompt.___EDITOR_isGoodForCallbackChooser = true;
TextInput.prototype.focus.___EDITOR_isGoodForCallbackChooser = true;
TextInput.latestPromptText = undefined;
/// #endif
