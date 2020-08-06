import {setValueByPath} from '../utils/get-value-by-path.js';
import getValueByPath from '../utils/get-value-by-path.js';
import callByPath from "../utils/call-by-path.js";
import Label from './label.js';
import Text from './text.js';
import Lib from "../lib.js";
import game from "../game.js";
import Container from './container.js';

export default class NumberInput extends Container {

	constructor() {
		super();
		this.onWheel = this.onWheel.bind(this);
	}
	
	onWheel(ev) {
		if(!this.isCanBePressed) {
			return;
		}
		let d = 0;
		let p = game.mouseEventToGlobalXY(ev);
		if(this.hitArea) {
			this.toLocal(p, undefined, p);
			if(this.hitArea.contains(p.x, p.y)) {
				d = ev.deltaY;
				ev.stopPropagation();
			}
		} else {
			if(this.getBounds().contains(p.x, p.y)) {
				d = ev.deltaY;
				ev.stopPropagation();
			}
		}

		if(d < 0) {
			if(this.canIncrease) {
				this.increase();
			} else {
				this.ySpeed = -1;
			}
		} else if(d > 0) {
			if(this.canDecrease) {
				this.decrease();
			} else {
				this.ySpeed = 1;
			}
		}
	}
	

	init() {
		super.init();
		this.currentInterval = 0;
		this.showedVal = undefined;
		this.defaultValue = this.value;
		this.on('pointerdown', this.onDown);
		this.buttonMode = true;
		this.cursor = 'ns-resize';
		this.dragging = false;
		this.ySpeed = 0;
		this._currentTextField = null;
		this._prevTextField = null;
		if(this.valuesList) {
			this.setValuesList(this.valuesList.split(',').map(i => parseFloat(i)));
		} else {
			this._values = null;
		}
		this.resetValue();
		document.addEventListener('wheel', this.onWheel, true);
	}

	onRemove() {
		super.onRemove();
		this._prevTextField = null;
		this._currentTextField = null;
		document.removeEventListener('wheel', this.onWheel, true);
	}
	
	get canDecrease() {
		return (this.value > this.min) || this.wrapValue;
	}
	
	get canIncrease() {
		return (this.value < this.max) || this.wrapValue;
	}

	get canDecreaseVisual() {
		return ((this.value > this.min) || this.wrapValue) && this.isCanBePressed;
	}
	
	get canIncreaseVisual() {
		return ((this.value < this.max) || this.wrapValue) && this.isCanBePressed;
	}
	
	setValuesList(valuesArray) {
		this._values = valuesArray;
		this.min = this._values[0];
		this.max = this._values[this._values.length -1];
	}
	
	formatValue(val) {
		return Label.formatMoney(val, this.decimalsCount);
	}
	
	update() {
		if(this.currentInterval <= 0 && this.dataPath) {
			let val = getValueByPath(this.dataPath, this);
			/// #if EDITOR
			if(typeof val != 'number' || isNaN(val)) {
				editor.ui.status.error('Number input refers to not numeric value (' + this.dataPath + ')' + val, 32004, this, 'dataPath');
				val = 0;
			}
			/// #endif
			this.setValue(val);
			this.currentInterval = this.refreshInterval;
		} else {
			this.currentInterval--;
		}
		
		
		if(this.value !== this.showedVal) {
			//console.log('CHANGE TO: ' + this.value);
			
			if(this._prevTextField) {
				//console.log('PREV EARLY REMOVED: ' + this._prevTextField.y);
				this._prevTextField.remove();
				this._currentTextField.y = 0;
				
			}
			this._prevTextField = this._currentTextField;
			
			let textRef;
			if(this.textView) {
				this._currentTextField = Lib.loadPrefab(this.textView);
				if(!(this._currentTextField instanceof Text)) {
					textRef = this._currentTextField.findChildrenByType(Text)[0];
					assert(textRef, "textView points to prefab which is not 'Text' and contains no 'Text'. Prefab name: " + this.textView, 10013);
				} else {
					textRef = this._currentTextField;
				}
			} else {
				textRef = Lib._loadClassInstanceById('Text');
				this._currentTextField = textRef;
			}
			
			if(this._prevTextField) {
				let isIncreasing;
				if(this.wrapValue) {
					isIncreasing = ((this.showedVal < this.value) && !((this.showedVal === this.min) && (this.value === this.max))) || ((this.showedVal === this.max) && (this.value === this.min));
				} else {
					isIncreasing = this.showedVal < this.value;
				}

				if(isIncreasing) {
					this._currentTextField.y = this._prevTextField.height;
				} else {
					this._currentTextField.y = -this._prevTextField.height;
				}
				this._currentTextField.y += this._prevTextField.y;
			} else {
				this._currentTextField.y = 0;
			}
			
			
			this._currentTextField.x = 0;
			
			textRef.text = this.formatValue(this.value);
			
			this.addChild(this._currentTextField);
			this.showedVal = this.value;
		}
		
		if(this.dragging) {
			if(!game.mouse.click) {
				this.dragging = false;
			} else {
				let tfHeight = this._currentTextField.height  * 0.5;

				let dy = game.mouse.y - this.startDragY;
				while(dy > tfHeight) {
					if(this.canDecrease) {
						this.decrease();
						dy -= tfHeight * 2;
						this.startDragY += tfHeight * 2;
					} else {
						this.startDragY = game.mouse.y;
						break;
					}
				}
				while(dy < -tfHeight) {
					if(this.canIncrease) {
						this.increase();
						dy += tfHeight * 2;
						this.startDragY -= tfHeight * 2;
					} else {
						this.startDragY = game.mouse.y;
						break;
					}
				}


				this.ySpeed += (game.mouse.y - this.prevDragY) * 0.1;
				this.prevDragY = game.mouse.y;

			}
		}
		
		if(this._currentTextField) {
			this.ySpeed += this._currentTextField.y * -0.15;
			this.ySpeed *= 0.7;
			
			
			this._currentTextField.y += this.ySpeed;
			this._currentTextField.alpha = 1.0 - Math.abs(this._currentTextField.y / this._currentTextField.height);
		}
		
		if(this._prevTextField) {
			this._prevTextField.y += this.ySpeed;
			this._prevTextField.alpha = 1.0 - this._currentTextField.alpha;
			if(Math.abs(this._prevTextField.y) >= (this._prevTextField.height - 4)) {
				//console.log('PREV REMOVED: ' + this._prevTextField.y);
				this._prevTextField.remove();
				this._prevTextField = null;
			}
		}
		super.update();
		
	}
	
	onDown() {
		this.dragging = true;
		this.prevDragY = game.mouse.y;
		this.startDragY = this.prevDragY;
	}
	
	resetValue() {
		this.setValue(this.defaultValue);
	}
	
	increase(val) {
		if(this._values) {
			let a = this._values;
			if(this.wrapValue) {
				this.setValue(a[(a.indexOf(this.value) + 1) % a.length]);
			} else {
				this.setValue(a[Math.min(a.indexOf(this.value) + 1, a.length-1)]);
			}
		} else {
			this.setValue(this.value + (val || this.step));
		}
	}
	
	decrease(val) {
		if(this._values) {
			let a = this._values;
			if(this.wrapValue) {
				this.setValue(a[(a.indexOf(this.value) - 1) % a.length]);
			} else {
				this.setValue(a[Math.max(a.indexOf(this.value) - 1, 0)]);
			}
		} else {
			this.setValue(this.value - (val || this.step));
		}
	}
	
	_modValue (x) {
		let n = this.max - this.min + 1;	
		return (((x - this.min) % n + n) % n) + this.min;
	}

	setValue(val) {
		if(val < this.min) {
			if(this.wrapValue) {
				val = this._modValue(val);
			} else {
				val = this.min;
			}
		} else if(val > this.max) {
			if(this.wrapValue) {
				val = this._modValue(val);
			} else {
				val = this.max;
			}
		}
		
		if(val !== this.value) {
			if(this.dataPath) {
				setValueByPath(this.dataPath, val, this);
			}
			this.value = val;
			if (this.onChanged) {
				callByPath(this.onChanged, this);
			}
		}
	}
	
	refreshNow() {
		this.currentInterval = 0;
	}
}

/// #if EDITOR
NumberInput.prototype.increase.___EDITOR_isGoodForCallbackChooser = true;
NumberInput.prototype.decrease.___EDITOR_isGoodForCallbackChooser = true;

NumberInput.__EDITOR_group = 'Extended';
NumberInput.__EDITOR_icon = 'tree/number-input';

__EDITOR_editableProps(NumberInput, [
	{
		type: 'splitter',
		title: 'NumberInput:',
		name: 'number-input'
	},
	{
		name: 'value',
		type: Number,
		important: true
	},
	{
		name: 'max',
		type: Number,
		default:100
	},
	{
		name: 'min',
		type: Number
	},
	{
		name: 'step',
		type: Number,
		default: 1
	},
	{
		name: 'decimalsCount',
		type: Number,
		min: 0
	},
	{
		name: 'textView',
		type: String,
		select:window.makePrefabSelector(undefined, true, (selectionItem) => {
			if(!selectionItem.value) return true;
			return Lib.__dataHasClass(Lib._getAllPrefabs()[selectionItem.value], Text);
		})
	},
	{
		name: 'dataPath',
		type: 'data-path',
		important: true
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
		name: 'valuesList',
		type: String
	},
	{
		name: 'interactive',
		type: Boolean,
		default: true,
		override: true
	},
	{
		type: 'ref',
		name: '_currentTextField'
	},
	{
		type: Boolean,
		name: 'wrapValue'
	}
]);


/// #endif