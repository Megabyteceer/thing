import Container from './container.js';
import getValueByPath from "utils/get-value-by-path.js";

export default class Trigger extends Container {

	init() {
		this.initialAlpha = this.alpha;
		this.initialScale = this.scale.x;
		this.initialX = this.x;
		this.initialY = this.y;

		if (this.dataPath) {
			this._state = this.getState();
		}
		if (this._state) {
			this.q = 0;
		} else {
			this.q = 1;
		}
		this.qSpeed = 0;
		this.triggering = false;
		this.interactiveChildren = this._state;
		this.updatePhase();
	}

	getState() {
		return this.invert === (!getValueByPath(this.dataPath, this));
	}

	show() {
		this._state = true;
		this.interactiveChildren = true;
		this.triggering = true;
	}

	set state (val) {
		this._state = val;
		this.triggering = true;
	}
	get state () {
		return this._state;
	}

	hide() {
		this._state = false;
		this.interactiveChildren = false;
		this.triggering = true;
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
		if((this.pow === 1) || ((Math.abs(qTo - this.q) < 0.01) && (Math.abs(this.qSpeed) < 0.01))) {
			this.triggering = false;
			this.q = qTo;
		} else {
			this.qSpeed += (qTo - this.q) * this.pow;
			this.qSpeed *= this.damp;
			this.q += this.qSpeed;
		}

		this.alpha = this.initialAlpha + this.q * this.alphaShift;
		this.visible = this.alpha > 0.01;

		if (this.scaleShift !== 0) {
			let s = this.initialScale + this.q * this.scaleShift;
			this.scale.x = s;
			this.scale.y = s;
		}
		this.visible = (this.alpha > 0.01) && (Math.abs(this.scale.x) > 0.001);

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
		}
	}
}

/// #if EDITOR

import Tip from "utils/tip.js";
Trigger.EDITOR_group = 'Extended';
Trigger.EDITOR_editableProps = [
		{
		type: 'splitter',
		title: 'Trigger:',
		name: 'trigger'
	},
	{
		name: 'state',
		type: Boolean
	},
	{
		name: 'dataPath',
		type: 'data-path',
		important: true,
		tip: Tip.tips.pathFieldTip
	},
	{
		name: 'invert',
		type: Boolean
	},
	{
		name: 'pow',
		type: Number,
		step: 0.001,
		min:0.001,
		max:1,
		default: 0.02,
		tip:'Speed of state swiching. Set it to <b>1.0</b> for instant switching.'
	},
	{
		name: 'damp',
		type: Number,
		step: 0.001,
		min:0.001,
		max:0.999,
		default: 0.85,
		tip:'Resistance for swiching.'
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
	}
];

Trigger.EDITOR_icon = 'tree/trigger';

Trigger.EDITOR_tip = `<b>Trigger</b> - is component which smoothly or instantly <b>switches</b> it's <b>visibility</b> or/and <b>position</b> accordingly of value of specified javaScript variable.`;

/// #endif
