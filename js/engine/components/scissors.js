import Container from "thing-editor/js/engine/components/container.js";
import game from "thing-editor/js/engine/game.js";

const p1 = new PIXI.Point();
const p2 = new PIXI.Point();

export default class Scissors extends Container {

	_disposeMaskScissor() {
		if(this.mask) {
			this.removeChild(this.mask);
			this.mask = null;
			this.appliedCanvasMaskX = null;
		}
	}

	set enabled(v) {
		this._enabled = v;
		if(v) {
			this.hitArea = new PIXI.Rectangle();
		} else {
			this.hitArea = null;
		}
	}

	get enabled() {
		return this._enabled;
	}

	_applyScissorHitArea() {
		if(this.hitArea) {
			let r = this.rect;
			p1.x = r.x;
			p1.y = r.y;
			p2.x = r.w + r.x;
			p2.y = r.h + r.y;
			this.toGlobal(p1, p1);
			this.toGlobal(p2, p2);

		
			this.hitArea.x = r.x;
			this.hitArea.y = r.y;
			this.hitArea.width = r.w;
			this.hitArea.height = r.h;
		}
	}

	_renderCanvas(renderer) {
		super._renderCanvas(renderer);
		if(this._enabled) {
			if(!this.mask) {
				this.mask = new PIXI.Graphics();
				/// #if EDITOR
				__getNodeExtendData(this.mask).hidden = true;
				/// #endif
				this.addChild(this.mask);
			}

			if(this.appliedCanvasMaskX !== this.rect.x ||
				this.appliedCanvasMaskY !== this.rect.y || 
				this.appliedCanvasMaskW !== this.rect.w || 
				this.appliedCanvasMaskH !== this.rect.h) {
					
				this.mask.clear();
				this.mask.beginFill(0,1);
				this.mask.drawRect(this.rect.x, this.rect.y, this.rect.w, this.rect.h);
				this.mask.endFill();

				this.appliedCanvasMaskX = this.rect.x;
				this.appliedCanvasMaskY = this.rect.y;
				this.appliedCanvasMaskW = this.rect.w;
				this.appliedCanvasMaskH = this.rect.h;
			}
			
			this._applyScissorHitArea();
		} else {
			this._disposeMaskScissor();
		}
	}

	render(renderer) {
		let gl;
		let isVasEnabled;
		let prevScissors;
		if(this._enabled) {
			gl = renderer.gl;
			renderer.batch.flush();

			isVasEnabled = gl.isEnabled(gl.SCISSOR_TEST);
			if(isVasEnabled) {
				prevScissors = gl.getParameter(gl.SCISSOR_BOX);
			}

			gl.enable(gl.SCISSOR_TEST);

			/// #if EDITOR
			if(!this.rect) {
				this.rect = {x:0, y:0, w:100, h:50};
			}

			/// #endif

			var resolution = renderer.resolution;

			this._applyScissorHitArea();

			if(game._isCanvasRotated) {
				gl.scissor(p2.x * resolution, (game.W - p2.y) * resolution, (p1.x - p2.x) * resolution, (p2.y - p1.y) * resolution);
			} else {
				gl.scissor(p1.x * resolution, (game.H - p2.y) * resolution, (p2.x - p1.x) * resolution, (p2.y - p1.y) * resolution);
			}
		}
		super.render(renderer);
		renderer.batch.flush();
		if(this._enabled) {
			if(isVasEnabled) {
				gl.scissor.apply(gl, prevScissors);
			} else {
				gl.disable(gl.SCISSOR_TEST);
			}
		}
	}

	enable() { /// 99999
		this.enabled = true;
	}

	disable() { /// 99999
		this.enabled = false;
	}

	onRemove() {
		super.onRemove();
		this._disposeMaskScissor();
	}

	/// #if EDITOR
	__beforeSerialization() {
		this._disposeMaskScissor();
	}
	/// #endif
}


/// #if EDITOR
Scissors.prototype.enable.___EDITOR_isGoodForCallbackChooser = true;
Scissors.prototype.disable.___EDITOR_isGoodForCallbackChooser = true;

Scissors.__EDITOR_group = 'Basic';
Scissors.__EDITOR_icon = 'tree/scissor';
Scissors.__EDITOR_tip = `<b>Scissors</b> - component which cuts it's content with rectangle area. Scissors works extremely fast against of Mask. Scissors does not support usage of filters or masks for its children or parents. In editor when you select children or parent of Scissor component, its could display with wrong masking because of selection higlight filter. You could disable helpers (Ctrl+H) to minimize effect. In release build, where is no selection - all will be fine.`;

__EDITOR_editableProps(Scissors, [
	{
		type: 'splitter',
		title: 'Scissors:',
		name: 'scissors'
	},
	{
		name: 'rect',
		type: 'rect',
		minW: 1,
		minH: 1
	},
	{
		name: 'enabled',
		type: Boolean,
		default: true
	}
]);
/// #endif