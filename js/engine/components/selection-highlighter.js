import getValueByPath from "../utils/get-value-by-path.js";
import {stepTo} from "../utils/utils.js";
import DSprite from "./d-sprite.js";

const rect = new PIXI.Rectangle();
const p = new PIXI.Point();

export default class SelectionHighlighter extends DSprite {

	init() {
		super.init();
		this.selectedObject = null;
		this.lt = this.findChildByName('lt');
		this.rt = this.findChildByName('rt');
		this.lb = this.findChildByName('lb');
		this.rb = this.findChildByName('rb');
	}

	select(o) {
		if(typeof o === 'string') {
			o = getValueByPath(o, this);
		}
		this.selectedObject = o;
		if (o) {
			this.gotoLabelRecursive('select');
			this.refreshCorners();
			this.selectionLockPow = 0;
		} else {
			this.stop();
		}
	}

	refreshCorners() {
		this.selectedObject.getLocalBounds(rect);
		this.lt.x = rect.left;
		this.lt.y = rect.top;
		this.rt.x = rect.right;
		this.rt.y = rect.top;
		this.lb.x = rect.left;
		this.lb.y = rect.bottom;
		this.rb.x = rect.right;
		this.rb.y = rect.bottom;
	}

	update() {
		if (this.selectedObject) {
			if (this.alpha < 1.0) {
				this.alpha += 0.1;
			}

			this.parent.toLocal(this.selectedObject, this.selectedObject.parent, p);
			this.x += (p.x - this.x) * this.selectionLockPow;
			this.y += (p.y - this.y) * this.selectionLockPow;
			this.rotation += (this.selectedObject.rotation - this.rotation) * this.selectionLockPow;
			this.xSpeed += (p.x - this.x) * 0.1;
			this.ySpeed += (p.y - this.y) * 0.1;
			this.rSpeed += (this.selectedObject.rotation - this.rotation) * 0.1;
			this.xSpeed *= 0.8;
			this.ySpeed *= 0.8;
			this.rSpeed *= 0.8;
			this.selectionLockPow = stepTo(this.selectionLockPow, 1, 0.1);
			
		} else {
			if (this.alpha > 0.0) {
				this.alpha -= 0.1;
			}
		}
		super.update();
	}
}

/// #if EDITOR
SelectionHighlighter.__EDITOR_group = 'Basic';
SelectionHighlighter.__EDITOR_icon = 'tree/select';


__EDITOR_editableProps(SelectionHighlighter, [{
	type: 'splitter',
	title: 'SelectionHighlighter:',
	name: 'selection-highlighter'
},
{
	type: 'ref',
	name: 'selectedObject'
},
{
	type: 'ref',
	name: 'lt'
},
{
	type: 'ref',
	name: 'rt'
},
{
	type: 'ref',
	name: 'lb'
},
{
	type: 'ref',
	name: 'rb'
}
]);
/// #endif


