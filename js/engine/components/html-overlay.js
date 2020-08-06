import ScrollLayer from "./scroll-layer.js";
import {stepTo} from "../utils/utils.js";
import game from "../game.js";

let _canvasBoundsCache = null;
let canvasScale = 1;
function recalcCanvasBounds() {
	if(!_canvasBoundsCache) {
		_canvasBoundsCache = game.pixiApp.view.getBoundingClientRect();
		canvasScale = _canvasBoundsCache.width / game.W;
	}
}

export default class HTMLOverlay extends ScrollLayer {

	init() {
		this.bouncingBounds = false;
		super.init();
		this.currentHtmlScale = 0;
		this.currentHtmlOpacity = 0;
		this.interactive = true;
		this._overlayIntervalUpdate = this._overlayIntervalUpdate.bind(this);
		assert(!this._htmlDiv, "previous this._htmlDiv instance was not removed properly");
	}

	onRemove() {
		super.onRemove();
		this._releaseHtmlDiv();
	}

	update() {
		_canvasBoundsCache = null;
		recalcCanvasBounds();
		if(this.handleScroll && this._htmlDiv) {
			if(this._htmlDiv.scrollHeight > this._htmlDiv.clientHeight) {
				this.fullArea.h = Math.max(this.visibleArea.h, Math.floor(this._htmlDiv.scrollHeight / canvasScale - 1));
			} else {
				this.fullArea.h = this.visibleArea.h;
			}
		}

		super.update();
		this.latestTime = game.time;

		if(this.handleScroll && this._htmlDiv) {
			this._htmlDiv.scrollTop = -this.y * canvasScale;
			this.y = -Math.round(this._htmlDiv.scrollTop / canvasScale);
		}
		this._updateHtmlOpacity();
	}

	_updateHtmlOpacity() {
		let isVisible = this.worldVisible && this._htmlContent && this.isCanBePressed && Math.abs(this.worldTransform.a) > 0.1 && !this._isHtmlContentInvalidated;
		let htmlTargetOpacity = isVisible ? this.worldAlpha : 0;
		this.currentHtmlOpacity = stepTo(this.currentHtmlOpacity, htmlTargetOpacity, this.fadeSpeed);
	}

	_overlayIntervalUpdate() {
		if((game.time - this.latestTime) > 1) {
			this._updateHtmlOpacity();
		}
		if(!this.worldVisible) {
			this._releaseHtmlDiv();
		}
	}

	_releaseHtmlDiv() {
		if(this._htmlDiv) {
			this._htmlDiv.remove();
			this._htmlDiv = null;
			clearInterval(this._overlayInterval);
			this._isHtmlContentInvalidated = false;
			this.currentHtmlScale = 0;
			this.currentHtmlOpacity = 0;
		}
	}

	render(renderer) {
		this._renderHtmlContainer();
		super.render(renderer);
	}

	_renderCanvas(renderer) {
		this._renderHtmlContainer();
		super._renderCanvas(renderer);
	}

	_renderHtmlContainer() {

		if(this.currentHtmlOpacity > 0.001
			/// #if EDITOR
			&& !game.__EDITOR_mode
			
		/// #endif
		) {
			if(!this._htmlDiv) {
				this._htmlDiv = document.createElement('div');
				this._htmlDiv.style.position = 'absolute';
				this._htmlDiv.innerHTML = this._htmlContent;
				this._htmlDiv.style.overflow = 'hidden';
				this._htmlDiv.style.zIndex = this.zIndex;
				this._htmlDiv.style.transformOrigin = "0 0";
				this._applyClassName();
				if(this.handleScroll) {
					this._htmlDiv.style.pointerEvents = 'none';
				}
				document.body.appendChild(this._htmlDiv);
				this._isHtmlContentInvalidated = false;
				this._overlayInterval = setInterval(this._overlayIntervalUpdate, 1000 / 60);
			}
			this._htmlDiv.style.opacity = this.currentHtmlOpacity;
			_canvasBoundsCache = null;

			recalcCanvasBounds();

			this._htmlDiv.style.left = (_canvasBoundsCache.left + Math.round(this.parent.worldTransform.tx) * canvasScale / game.stage.scale.x) + 'px';
			

			this._htmlDiv.style.top = (_canvasBoundsCache.top + Math.round(this.parent.worldTransform.ty) * canvasScale / game.stage.scale.x) + 'px';
			


			this._htmlDiv.style.width = (this.visibleArea.w * canvasScale) + 'px';
			
			this._htmlDiv.style.height = (this.visibleArea.h * canvasScale) + 'px';
			
			if(Math.abs(this.currentHtmlScale - this.worldTransform.a) > 0.001) {
				this.currentHtmlScale = this.worldTransform.a;
				this._htmlDiv.style.transform = 'scale(' + (this.currentHtmlScale / game.stage.scale.x).toFixed(3) + ')';
			}
		} else {
			this._releaseHtmlDiv();
		}
	}

	_onRenderResize() {
		this._applyClassName();
	}

	_applyClassName() {
		if(this._htmlDiv) {
			this._htmlDiv.className = this.className + (game.isPortrait ? " portrait-" : " landscape-") + this.className;
		}
	}

	get innerHTML() {
		return this._htmlContent;
	}
	set innerHTML(v) {
		if(this._htmlContent !== v) {
			this._isHtmlContentInvalidated = !!this._htmlDiv;
			this._htmlContent = v;
		}
	}
}




/// #if EDITOR
HTMLOverlay.__EDITOR_group = 'Extended';
HTMLOverlay.__EDITOR_icon = 'tree/html';

__EDITOR_editableProps(HTMLOverlay, [
	{
		type: 'splitter',
		title: 'HTMLOverlay:',
		name: 'HTMLOverlay'
	},
	{
		name: 'innerHTML',
		type: String
	},
	{
		name: 'handleScroll',
		type: Boolean,
		default: true
	},
	{
		name: 'zIndex',
		type: Number,
		default: 10000
	},
	{
		name: 'className',
		type: String
	},
	{
		name: 'fadeSpeed',
		type: Number,
		default: 0.1,
		min: 0.0001,
		max: 1,
		step: 0.0001
	},
	{
		name: 'bouncingBounds',
		override: true,
		type: Boolean,
		default: false,
		visible: () => {}
	},
]);
/// #endif