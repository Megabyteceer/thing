import getValueByPath from '../utils/get-value-by-path.js';
import callByPath from "../utils/call-by-path.js";
import L from "../utils/l.js";
import Text from "./text.js";
import game from "../game.js";
import {stepTo} from '../utils/utils.js';

function formatMoney(num, c = 0) {
	assert(typeof num === 'number', "Numeric value expected, but got '" + typeof num + "'", 10012);
	
	let neg = num < 0;
	let ret;
	if(neg) {
		num = -num;
	}

	if (c > 0) {
		let str = num.toFixed(c).split('.');
		if (str[0].length > 3) {
			str[0] = str[0].replace(/(.)(?=(.{3})+$)/g, '$1 ');
		}
		ret = str.join('.');
	} else {
		ret = num.toFixed(0).replace(/(.)(?=(.{3})+$)/g, '$1 ');
	}
	if(neg) {
		return '-' + ret;
	}
	return ret;
}

export default class Label extends Text {

	init() {
		super.init();
		this.currentInterval = 0;
		this.text = '';
		this.showedVal = undefined;
		this.processedVal = undefined;
		this.lastUpdateTime = game.time;
	}
	
	onLanguageChanged() {
		if(this._translatableText) {
			this.showedVal = undefined;
			this.refreshNow();
			
			if(
			/// #if EDITOR
				game.__EDITOR_mode ||
				/// #endif
				game.__paused) super.onLanguageChanged();
		
		}
	}

	customizeVal(val) {
		return val;
	}
	
	update() {
		if((game.time - this.lastUpdateTime) > 1) {
			this.refreshNow();
		}
		this.lastUpdateTime = game.time;

		if(this.currentInterval <= 0 && this.dataPath) {
			
			let val = getValueByPath(this.dataPath, this);
			val = this.customizeVal(val);
			if(val || val === 0) {
				if(val !== this.processedVal) {
					if(this.onChanged) {
						callByPath(this.onChanged, this);
					}
					this.processedVal = val;
				}
				
				if(val !== this.showedVal) {
					this.visible = true;
					this.applyValue(val);
				}
			} else {
				this.processedVal = undefined;
				this.showedVal = undefined;
				this.visible = false;
			}
		
			this.currentInterval = this.refreshInterval;
		} else {
			this.currentInterval--;
		}
		super.update();
	}

	applyValue(val) {
		if(this.isNumeric) {
			if((this.counterSpeed < 1) && (this.showedVal !== undefined)) {
				let step = Math.max(1 / Math.pow(10, this.decimalsCount) , Math.abs((val - (this.showedVal || 0)) * this.counterSpeed));
				this.showedVal = stepTo(this.showedVal || 0, val, step);
				if (this.showedVal === val) {
					if(this.onCounterFinish) {
						callByPath(this.onCounterFinish, this);
					}
				} else {
					if (this.onCounter) {
						callByPath(this.onCounter, this);
					}
				}
			} else {
				this.showedVal = val;
			}
			if(this.plusMinus && val > 0) {
				val = '+' + Label.formatMoney(this.showedVal, this.decimalsCount);
			} else {
				val = Label.formatMoney(this.showedVal, this.decimalsCount);
			}
						
		} else {
			this.showedVal = val;
		}
					
		if(this.template) {
			this.text = this.template.replace('%d', val);
		} else if(this._translatableText) {
			this.text = L(this._translatableText, val);
		} else {
			this.text = val;
		}
	}

	freezeCounter() {
		this.currentInterval = 1000000000;
	}

	unfreezeCounter() {
		this.currentInterval = 0;
	}
	
	refreshNow() {
		this.currentInterval = 0;
	}
	
	/// #if EDITOR
	__beforeSerialization() {
		super.__beforeSerialization();
		if(this._translatableText) {
			this.template = null;
		}
	}
	
	/// #endif
}

Label.formatMoney = formatMoney;

/// #if EDITOR

Label.__EDITOR_group = 'Extended';
Label.__EDITOR_icon = 'tree/label';
Label.__EDITOR_tip = `<b>Label</b> - is component which represent value of specified javaScript variable on screen. Useful for in-game counters.`;

__EDITOR_editableProps(Label, [
	{
		type: 'splitter',
		title: 'Label:',
		name: 'label'
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
		name: 'refreshInterval',
		type: Number,
		min: 0,
		default: 10
	},
	{
		name: 'template',
		type: String,
		tip: `Label's text template with <b>%d</b> as marker of place where value will be inserted.
As example label with template <b>Your money: %d coins</b> will appear on screen as "Your money: 1000 coins".`,
		disabled:(node) => {
			return node.translatableText;
		}
	},
	{
		name: 'isNumeric',
		type: Boolean
	},
	{
		name: 'plusMinus',
		type: Boolean,
		disabled:(node) => {
			return !node.isNumeric;
		}
	},
	{
		name: 'counterSpeed',
		type: Number,
		min:0.001,
		max:1,
		step: 0.001,
		default: 1,
		tip: `When counterSpeed is <b>1</b> - label instantly takes and represent value.
<b>When counterSpeed less that 1</b> - label shows value as counter in few steps`,
		visible:(node) => {
			return node.isNumeric;
		}
	},
	{
		name: 'decimalsCount',
		type: Number,
		min: 0,
		max: 20,
		visible:(node) => {
			return node.isNumeric;
		}
	},
	{
		name: 'onChanged',
		type: 'callback'
	},
	{
		name: 'onCounter',
		type: 'callback'
	},
	{
		name: 'onCounterFinish',
		type: 'callback'
	}
]);


/// #endif
