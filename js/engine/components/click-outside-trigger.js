import Container from "./container.js";
import game from "../game.js";
import callByPath from "../utils/call-by-path.js";

let interaction;

export default class ClickOutsideTrigger extends Container {

	init() {
		/// #if EDITOR
		if(!this.onClickOutside) {
			editor.ui.status.warn('onClickOutside event handler is empty.', 32020, this, 'onClickOutside');
		}
		/// #endif
		interaction = game.pixiApp.renderer.plugins.interaction;
		super.init();
		this.onStageDown = this.onStageDown.bind(this);
		this.handlerAdded = false;
	}

	onRemove() {
		super.onRemove();
		this.removeHandler();
	}

	onStageDown(ev) {
		if(game.time - this.time > 1) {
			this.removeHandler();
			return;
		}
		if(!ev.target) {
			this.fire();
		} else {
			let p = ev.target.parent;
			while(p) {
				if(p === this) {
					return;
				}
				if(p === game.stage) {
					this.fire();
					return;
				}
				p = p.parent;
			}
		}
	}

	fire() {
		if(this.onClickOutside) {
			callByPath(this.onClickOutside, this);
		}
	}

	_onDisableByTrigger() {
		this.removeHandler();
	}

	update() {
		if(!this.handlerAdded) {
			this.handlerAdded = true;
			interaction.on('pointerdown', this.onStageDown);
		}
		this.time = game.time;
		super.update();
	}

	removeHandler() {
		if(this.handlerAdded) {
			this.handlerAdded = false;
			interaction.removeListener('pointerdown', this.onStageDown);
		}
	}
}

/// #if EDITOR
__EDITOR_editableProps(ClickOutsideTrigger, [
	{
		type: 'splitter',
		title: 'ClickOutsideTrigger:',
		name: 'click-outside-trigger'
	},
	{
		name: 'onClickOutside',
		type: 'callback',
		important: true
	}
]);
ClickOutsideTrigger.__EDITOR_group = 'Basic';
ClickOutsideTrigger.__EDITOR_icon = 'tree/click-outside';
/// #endif