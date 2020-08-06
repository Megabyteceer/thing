import L from "../utils/l.js";
import game from "../game.js";
import getValueByPath from "thing-editor/js/engine/utils/get-value-by-path.js";

const Text = PIXI.Text;
export default Text;

const CENTER = 'center';
const LEFT = 'left';
const RIGHT = 'right';
const TOP = 'top';
const BOTTOM = 'bottom';

const alignValues = {
	'center': 0.5,
	'left': 0.0,
	'right': 1.0,
	'top': 0.0,
	'bottom': 1.0
};

const TEXT_TRANSFORM = {
	'none': 0,
	'uppercase': 1,
	'capitalize': 2,
	'lowercase': 3
};
const applyTextTransform = (value, textTransform) => {
	if (textTransform === TEXT_TRANSFORM.none) return value;
	if (textTransform === TEXT_TRANSFORM.uppercase) return value.toUpperCase();
	if (textTransform === TEXT_TRANSFORM.lowercase) return value.toLowerCase();
	if (textTransform === TEXT_TRANSFORM.capitalize) return value.replace(/(?:^|\s)\S/g, (char) => char.toUpperCase());
	assert(false, `Invalid "textTransform" value for text (${textTransform})`);
};

Object.defineProperties(Text.prototype, {
	translatableText:{
		get: function () {
			return this._translatableText;
		},
		set: function (val) {
			if(this._translatableText !== val) {
				if(val) {
					/// #if EDITOR
					if(!L.has(val)) {
						editor.ui.status.warn('translatableText refers to not existing key: "' + val + '"', 32032, this, 'translatableText');
					}
					/// #endif
					this.text = L(val);
				}
				this._translatableText = val;
			}
		}
	},
	image: { //remove sprite texture property
		get: function () {
			return undefined;
		},
		set: function () {
		}
	},
	'style.align': {
		get: function () {
			return this.style.align;
		},
		set: function (val) {
			if(this.style.align != val) {
				this.style.align = val;
				this._refreshAnchor();
				this.checkAlignBlur();
			}
		}, configurable: true
	},
	'verticalAlign': {
		get: function () {
			return this._verticalAlign;
		},
		set: function (val) {
			if(this._verticalAlign != val) {
				this._verticalAlign = val;
				this._refreshAnchor();
				this.checkAlignBlur();
			}
		}, configurable: true
	},
	'style.fill': {
		get: function () {
			return this._styleFill;
		},
		set: function (val) {
			if(val && val.indexOf(',') >= 0) {
				/// #if EDITOR
				val = val.replace(/(\s|")/g,'');
				/// #endif
				this.style.fill = val.split(',')
				/// #if EDITOR
					.filter((c) => {	
						return isColor(c, this);
					});
				if(this.style.fill.length === 0) {
					this.style.fill = '#000';
				}
				/// #endif
			} else {
				this.style.fill = val;
			}
			this._styleFill = val;
		}, configurable: true
	},
	'style.fillGradientStops': {
		get: function () {
			return this._styleFillGradientStops;
		},
		set: function (val) {
			if(val) {
				val = val.replace(/\s/g,'');
				this.style.fillGradientStops = val.split(',').map(i => i ? parseFloat(i) : 1);
			} else {
				this.style.fillGradientStops.length = 0;
			}
			this._styleFillGradientStops = val;
		}, configurable: true
	},
	'style.fontFamily': {
		get: function () {
			return this._fontFamily;
		},
		set: function (val) {
			this.style.fontFamily = val || game.projectDesc.defaultFont;
			this._fontFamily = val;
		}, configurable: true
	},
	'style.fontWeight': {
		get: function () {
			return this.style.fontWeight;
		},
		set: function (val) {
			this.style.fontWeight = val;
		}, configurable: true
	},
	'style.fontSize': {
		get: function () {
			return this.style.fontSize;
		},
		set: function (val) {
			this.style.fontSize = val;
		}, configurable: true
	},
	'style.leading': {
		get: function () {
			return this.style.leading;
		},
		set: function (val) {
			this.style.leading = val;
		}, configurable: true
	},
	'style.padding': {
		get: function () {
			return this.style.padding;
		},
		set: function (val) {
			this.style.padding = val;
		}, configurable: true
	},
	'style.letterSpacing': {
		get: function () {
			return this.style.letterSpacing;
		},
		set: function (val) {
			this.style.letterSpacing = val;
		}, configurable: true
	},
	'style.stroke': {
		get: function () {
			return this.style.stroke;
		},
		set: function (val) {
			this.style.stroke = val;
		}, configurable: true
	},
	'style.strokeThickness': {
		get: function () {
			return this.style.strokeThickness;
		},
		set: function (val) {
			this.style.strokeThickness = val;
			this.style.lineJoin = 'round';
		}, configurable: true
	},
	'style.dropShadow': {
		get: function () {
			return this.style.dropShadow;
		},
		set: function (val) {
			this.style.dropShadow = val;
		}, configurable: true
	},
	'style.drShColor': {
		get: function () {
			return this.style.dropShadowColor;
		},
		set: function (val) {
			this.style.dropShadowColor = val;
		}, configurable: true
	},
	'style.drShAlpha': {
		get: function () {
			return this.style.dropShadowAlpha;
		},
		set: function (val) {
			this.style.dropShadowAlpha = val;
		}, configurable: true
	},
	'style.drShAngle': {
		get: function () {
			return this.style.dropShadowAngle;
		},
		set: function (val) {
			this.style.dropShadowAngle = val;
		}, configurable: true
	},
	'style.drShBlur': {
		get: function () {
			return this.style.dropShadowBlur;
		},
		set: function (val) {
			this.style.dropShadowBlur = val;
		}, configurable: true
	},
	'style.drShDistance': {
		get: function () {
			return this.style.dropShadowDistance;
		},
		set: function (val) {
			this.style.dropShadowDistance = val;
		}, configurable: true
	},
	'textTransform': {
		get: function() {
			return this._textTransform;
		},
		set: function(v) {
			if(v !== this._textTransform) {
				this._textTransform = v;
				if(v && this._text) {
					this._text = applyTextTransform(this._text, this.textTransform);
					this.dirty = true;
				}
			}
		},
		configurable: true
	},
	'maxWidth': {
		get: function () {
			return this._maxWidth;
		},
		set: function (val) {
			this._maxWidth = val;
			if(this._maxWidth !== 0) {
				if(this._texture.width > this._maxWidth) {
					var q = this._maxWidth / this._texture.width;
					if(this.scale.x !== q || this.scale.y !== q) {
						this.scale.x = q;
						this.scale.y = q;
						if(this.parent) {
							this.updateTransform();
						}
					}
				} else {
					if(this.scale.x !== 1 || this.scale.y !== 1) {
						this.scale.x = 1;
						this.scale.y = 1;
						if(this.parent) {
							this.updateTransform();
						}
					}
				}
			}
		}, configurable: true
	}
});

let d = Object.getOwnPropertyDescriptor(Text.prototype, 'text');
assert(d, "Text component needs refactoring", 90001);
const originalTextSetter = d.set;
d.set = function(v) {
	if(this.textTransform && v) {
		originalTextSetter.call(this, applyTextTransform(v, this.textTransform));
	} else {
		originalTextSetter.call(this, v);
	}
};
Object.defineProperty(Text.prototype, 'text', d);

let _original_onTextureUpdate = Text.prototype._onTextureUpdate;
Text.prototype._onTextureUpdate = function _onTextureUpdate() { // centred text with odd width is blurred bug fix
	this.checkAlignBlur();
	_original_onTextureUpdate.call(this);
	this.maxWidth = this._maxWidth || 0; // recalculate max width
};

Text.prototype.onRemove = function() {
	/// #if EDITOR
	editor._root_onRemovedCalled = true;
	/// #endif
	this._maxWidth = 0;
};

// 99999
Text.prototype.setTextByPath = function(path) {
	this.text = getValueByPath(path, this);
};

Text.prototype.setAlign = function(align) {
	this['style.align'] = align;
};

Text.prototype.checkAlignBlur = function checkAlignBlur() {
	let w = this.texture.width;
	if(w > 0) {
		if(this.style.align === CENTER) {
			this.anchor.x = Math.round(0.5 * w) / w;
		}
		let h = this.texture.height;
		if(this.style._verticalAlign === CENTER) {
			this.anchor.y = Math.round(0.5 * h) / h;
		}
	}
};

Text.prototype.onLanguageChanged = function onLanguageChanged() {
	if(this._translatableText) {
		let t = this._translatableText;
		this._translatableText = null;
		this.translatableText = t;
	}
};

Text.prototype._refreshAnchor = function() {
	this.anchor.set(alignValues[this.style.align], alignValues[this._verticalAlign]);
};

/// #if EDITOR

function isColor(strColor, node) {
	var s = new Option().style;
	s.color = strColor;
	if(s.color) {
		return true;
	} else {
		if(!game.__EDITOR_mode) {
			editor.ui.status.error("Wrong color gradient entry: " + strColor, 99999, node, "style.fill");
		}
	}
}
  
  

import LanguageView from "thing-editor/js/editor/ui/language-view.js";

Text.prototype.__EDITOR_onCreate = function __EDITOR_onCreate() {
	this.text = "New Text 1";
};

Text.prototype.__beforeSerialization = function __beforeSerialization() {
	if(this._translatableText) {
		this.text = '';
	}
	if(this.maxWidth > 0) {
		this.scale.x = 1;
		this.scale.y = 1;
	}
};
Text.prototype.__afterSerialization = function __afterSerialization() {
	if(this._translatableText) {
		this.text = L(this._translatableText);
	}
	if(this.maxWidth > 0) {
		let tmp = this.maxWidth;
		this.maxWidth = 0;
		this.maxWidth = tmp;
	}
};

Text.__EDITOR_icon = 'tree/text';
Text.__EDITOR_group = 'Basic';

__EDITOR_editableProps(Text, [
	{
		name: 'image',
		type: String,
		override: true,
		visible:(node) => {
			return !(node instanceof Text);
		}
	},
	{
		type: 'splitter',
		title: 'Text:',
		name: 'text-props'
	},
	{
		name: 'text',
		type: String,
		parser: (v) => {
			if(v && v.length === 2 &&  v.charCodeAt(0) === 32) return v.substr(1);
			return v;
		},
		default:'',
		important: true,
		disabled:(node) => {
			return node.translatableText;
		}
	},
	window.makeTranslatableSelectEditablePropertyDecriptor('translatableText'),
	{
		type: 'btn',
		title: 'Edit or create new translatable key.',
		name: 'Edit text',
		helpUrl: 'components.Text#edit-text',
		onClick: (o) => {
			LanguageView.editKey(o.translatableText);
		}
	},
	{
		type: 'splitter',
		title: 'Style:',
		name: 'text-style'
	},
	{
		name: 'style.fontSize',
		type: Number,
		min:1,
		max:300,
		default: 12,
		important: true
	},
	{
		name: 'style.align',
		type: String,
		select: [
			{name: CENTER, value: CENTER},
			{name: LEFT, value: LEFT},
			{name: RIGHT, value: RIGHT}
		],
		default: CENTER
	},
	{
		name: 'verticalAlign',
		type: String,
		select: [
			{name: TOP, value: TOP},
			{name: CENTER, value: CENTER},
			{name: BOTTOM, value: BOTTOM}
		],
		default: TOP
	},
	{
		name: 'style.fill',
		type: String,
		default:'#ffffff'
	},
	{
		name: 'style.fillGradientStops',
		type: String,
		visible: (node) => {
			return node._styleFill && node._styleFill.indexOf(',') >= 0;
		}
	},
	{
		name: 'style.strokeThickness',
		type: Number,
		min:0
	},
	{
		name: 'style.stroke',
		type: String,
		default:'#000000',
		disabled:(node) => {
			return node.style.strokeThickness < 1;
		}
	},
	{
		name: 'style.dropShadow',
		type: Boolean,
		default: false,
	},
	{
		name: 'style.drShColor',
		type: String,
		default:'#000000',
		visible:(node) => node.style.dropShadow
	},
	{
		name: 'style.drShAlpha',
		type: Number,
		default: 1,
		step: 0.01,
		min:0,
		visible:(node) => node.style.dropShadow
	},
	{
		name: 'style.drShAngle',
		type: Number,
		default: 0.524,
		step: 0.001,
		visible:(node) => node.style.dropShadow
	},
	{
		name: 'style.drShBlur',
		type: Number,
		default: 0,
		step: 0.01,
		min:0,
		visible:(node) => node.style.dropShadow
	},
	{
		name: 'style.drShDistance',
		type: Number,
		default: 5,
		min:0,
		visible:(node) => node.style.dropShadow
	},
	{
		name: 'style.fontFamily',
		type: String
	},
	{
		name: 'style.fontWeight',
		type: String,
		select: () => {
			let availableWeights = {};
			let family = editor.selection[0].style.fontFamily.split(',')[0].replace(/['"]/gm,'').trim();
			for(let f of Array.from(document.fonts.values())) {
				if(f.family === family) {
					let w = parseInt(f.weight);
					if(w < 301) {
						availableWeights.lighter = true;
					} else if(w > 801) {
						availableWeights.bolder = true;
					} else if(w > 501) {
						availableWeights.bold = true;
					} else {
						availableWeights.normal = true;
					}
				}
			}
			let a = Object.keys(availableWeights);
			if(a.length > 0) {
				return a.map((k) => {
					return {name: k, value: k};
				});
			}
			return [
				{name: 'normal', value: 'normal'},
				{name: 'bold', value: 'bold'},
				{name: 'bolder', value: 'bolder'},
				{name: 'lighter', value: 'lighter'}
			];
		},
		default: 'normal'
	},
	{
		name: 'style.leading',
		type: Number
	},
	{
		name: 'style.padding',
		type: Number
	},
	{
		name: 'style.letterSpacing',
		type: Number
	},
	{
		name: 'textTransform',
		type: Number,
		select: Object.entries(TEXT_TRANSFORM).map(([name, value]) => ({name, value})),
		default: TEXT_TRANSFORM.none
	},
	{
		name: 'maxWidth',
		type: Number,
		afterEdited: (overrideO) => {
			let o = overrideO || editor.selection[0];
			let x = o.maxWidth;
			if(x === 0) {
				for(let t of editor.selection) {
					t.scale.x = 1;
					t.scale.y = 1;
				}
			} else {
				switch(o.style.align) {
				case CENTER:
					x *= 0.5;
					break;
				case RIGHT:
					x *= -1;
					break;
				}
				let tmpScale = o.scale.x;
				o.scale.x = 1;
				o.scale.y = 1;
				editor.overlay.guideX(x , o);
				o.scale.x = tmpScale;
				o.scale.y = tmpScale;
			}
		}
	}
]);

/// #endif
