import getValueByPath, { setValueByPath } from '../utils/get-value-by-path.js';
import callByPath from "../utils/call-by-path.js";
import Container from "./container.js";
import game from "../game.js";
import Fill from './fill.js';
import Button from './button.js';
import NineSlicePlane from './nine-slice-plane.js';
import Shape from './shape.js';
import Lib from '../lib.js';

const tmpPoint = new PIXI.Point();

function setObjectHeight(node, height) {
	if(node instanceof Shape || node instanceof NineSlicePlane) { //prevent wrong size in next life of "bar" sprite instance
		node.height = height;
	} else if(node.texture) {
		node.scale.y = height / node.texture.height;
		if(node instanceof Fill) {
			node.yRepeat = node.scale.y;
		}
	}
}

export default class ProgressBar extends Container {

	constructor() {
		super();
	}

	init() {
		super.init();
		this.scrolling = false;
		this.currentInterval = 0;
		this.showedVal = undefined;
		this.bar = this.findChildByName('bar');
		this.cap = this.findChildByName('cap');

		this.buttonMode = this.interactive;
		this.on('pointerdown', this.onDown);
		this._applyBgHeight();
	}

	get height() {
		return this._height || 200;
	}

	set height(v) {
		if(this._height !== v) {
			this._height = v;
			this.applyValue(this.showedVal || 0);
			this._applyBgHeight();
		}
	}

	_applyBgHeight() {
		let h = this.getChildByName('bg');
		if(h) {
			setObjectHeight(h, this._height);
		}	
	}

	onRemove() {
		super.onRemove();
		this._height = undefined;
		this.bar = null;
		this.cap = null;
		this.removeListener('pointerdown', this.onDown);
	}

	onDown() {
		if(this.isCanBePressed) {
			this.scrolling = true;
		}
	}

	update() {
		if(this.scrolling) {
			if(game.mouse.click) {
				let p = this.toLocal(game.mouse, game.stage, tmpPoint, true);
				let q = p.y / this._height;
				if(q < 0) {
					q = 0;
				} else if(q > 1) {
					q = 1;
				}
				let val = this.min + q * (this.max - this.min);
				if(this.step > 0) {
					val = Math.round(val / this.step) * this.step;
				}
				this.applyValue(val);
				if(this.dataPath) {
					setValueByPath(this.dataPath, val, this);
				}
			} else {
				this.scrolling = false;
				if(this.afterSlide) {
					callByPath(this.afterSlide, this);
				}
			}
		} else if(this.currentInterval <= 0 && this.dataPath) {
			let val = getValueByPath(this.dataPath, this);
			if(val || val === 0) {
				if(val > this.max) {
					val = this.max;
				}
				if(val < this.min) {
					val = this.min;
				}
				if(val !== this.showedVal) {
					this.visible = true;
					this.applyValue(val);
				}
			} else {
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
		if(val !== this.showedVal) {
			if(this.onChanged
				/// #if EDITOR
				&& !game.__EDITOR_mode
				/// #endif
			) {
				callByPath(this.onChanged, this);
			}
		}
		this.showedVal = val;
		let q = (val - this.min) / (this.max - this.min);
		if(this.bar) {
			setObjectHeight(this.bar, this._height * q);
		}
		if(this.cap) {
			this.cap.y =  this.capMargin + (this._height - this.capMargin * 2) * q;
		}
	}
	
	refreshNow() {
		this.currentInterval = 0;
	}
	
	/// #if EDITOR
	__beforeDeserialization() {
		delete this._height;
	}

	__afterDeserialization() {
		this._applyBgHeight();
	}

	__EDITOR_onCreate() {
		this.interactive = true;
		for(let childData of [
			{
				"c": "Sprite",
				"p": {
					"name": "bg",
					"alpha": 0.5,
					"interactive": true,
					"scale.y": 20.8,
					"image": "WHITE"
				}
			},
			{
				"c": "Sprite",
				"p": {
					"name": "bar",
					"interactive": true,
					"scale.y": 13.666666666666666,
					"image": "WHITE",
					"tint": 65280
				}
			},
			{
				"c": "Sprite",
				"p": {
					"name": "cap",
					"x": 5,
					"interactive": true,
					"scale.x": 2,
					"scale.y": 2,
					"pivot.x": 5,
					"pivot.y": 5,
					"image": "WHITE"
				}
			}]
		) {
			let c = Lib._loadClassInstanceById(childData.c);
			Object.assign(c, childData.p);
			this.addChild(c);
		}
	}
	/// #endif
}

/// #if EDITOR

ProgressBar.__EDITOR_group = 'Extended';
ProgressBar.__EDITOR_icon = 'tree/progress';
ProgressBar.__EDITOR_tip = `<b>ProgressBar</b> - component which represent value of specified javaScript variable as bar.`;

__EDITOR_editableProps(ProgressBar, [
	{
		type: 'splitter',
		title: 'ProgressBar:',
		name: 'progress-bar'
	},
	{
		name: 'dataPath',
		type: 'data-path',
		important: true,
		tip: `Contains string path to javascript variable to get value from.
As example path can be: <b>game.stage.height</b> or <b>this.parent.name</b>.
Supports <b>game</b>, <b>this</b> or Component's class name as root object.
Use '#' to acess to child scene nodes by name: <b>game.currentScene.#myChildElementsName.x</b>.`
	},
	{
		name: 'height',
		type: Number,
		min: 0,
		default: 200
	},
	{
		name: 'capMargin',
		type: Number,
		min: 0,
		default: 5
	},
	{
		name: 'refreshInterval',
		type: Number,
		min: 0,
		default: 10
	},
	{
		name: 'onChanged',
		type: 'callback'
	},
	{
		name: 'afterSlide',
		type: 'callback'
	},
	{
		name: 'min',
		type: Number,
		step:0.00001
	},
	{
		name: 'max',
		type: Number,
		step:0.00001,
		default:100
	},
	{
		name: 'step',
		type: Number,
		step:0.00001,
		min: 0,
		default: 1
	},
	{
		type: 'ref',
		name: 'bar'
	},
	{
		type: 'ref',
		name: 'cap'
	}
	
]);


/// #endif