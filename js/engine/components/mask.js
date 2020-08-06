import Container from "./container.js";

export default class Mask extends Container {

	init() {
		super.init();
		this._maskComponentIsActive = true;
		if(this._enabled) {
			this.enableMask();
		}
	}

	set enabled(v) {
		this._enabled = v;
		if(this._maskComponentIsActive) {
			if(v) {
				this.enableMask();
			} else {
				this.disableMask();
			}
		}
	}

	get enabled() {
		return this._enabled;
	}

	enableMask() {
		this.mask = this.findChildByName('mask');

		/// #if EDITOR
		if(!this.mask) {
			editor.ui.status.warn('Mask component did not found child named "mask".', 32022, this);
		}
		/// #endif
		if(this.mask) {
			this.__maskVisibility = this.mask.visible;
		}
		if(this.mask) {
			this.mask.visible = true;
		}
	}

	disableMask() {
		if(this.mask) {
			this.mask.visible = this.__maskVisibility;
		}
		this.mask = null;
	}

	onRemove() {
		super.onRemove();
		this._maskComponentIsActive = false;
		this.disableMask();
	}

	/// #if EDITOR

	constructor() {
		super();
		this.__exitPreviewMode = this.__exitPreviewMode.bind(this);
	}

	__goToPreviewMode() {
		this.enableMask();
	}

	__exitPreviewMode() {
		this.disableMask();
	}
	/// #endif	
}

/// #if EDITOR
Mask.__EDITOR_group = 'Extended';
Mask.__EDITOR_icon = 'tree/mask';

__EDITOR_editableProps(Mask,  [
	window.makePreviewModeButton('Preview masked', 'components.Mask#preview-masked'),
	{
		name: 'enabled',
		type: Boolean,
		default: true
	}
]);

Mask.prototype.enableMask.___EDITOR_isGoodForCallbackChooser = true;
Mask.prototype.disableMask.___EDITOR_isGoodForCallbackChooser = true;
/// #endif