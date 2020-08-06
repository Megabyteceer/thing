import Text from "./text.js";
import Lib from "../lib.js";
import game from "../game.js";
import getValueByPath from "../utils/get-value-by-path.js";

export default class FlyText extends Text {
	
	init() {
		super.init();
		this.phase = 0;
	}

	hide() {
		this.phase = 0;
	}
	
	update() {
		super.update();
		this.y -= 1.0;
		this.phase--;
		if (this.phase <= 0) {
			this.alpha -= 0.05;
			if (this.alpha <= 0.0) {
				this.remove();
			}
		} else {
			if (this.alpha < 0.95) {
				this.alpha += 0.2;
			}
		}
	}
	
	static flyText(text, X = null, Y = null, type = 'flytext', lengthAdd = 0, container) {
		assert(!game.__EDITOR_mode, "Attempt to call FlyText.flyText() in editing mode.", 10010);
		assert(game.currentContainer, "FlyText.flyText() can be invoked only after first scene has been shown", 10011);


		if (typeof X !== 'number') {
			X = game.W / 2;
		}
		if (typeof Y !== 'number') {
			Y = game.H / 2;
		}
		
		let f = Lib.loadPrefab(type);
		assert(f instanceof FlyText, "FlyText instance expected.", 10011);
		f.text = text;
		f.phase = text.length * 6 + lengthAdd;
		
		let fld = (f.width / 2) + 5.0;
		
		if (X < fld) {
			X = fld;
		}
		
		if (X > (game.W - fld)) {
			X = (game.W - fld);
		}
		
		f.alpha = 0.0;
		f.x = X;
		f.y = Y;
		
		if(container) {
			if(typeof container === 'string') {
				container = getValueByPath(container, game.currentContainer);
			}
		} else {
			container = game.currentContainer;
		}
		container.addChild(f);
		return f;
	}
}


/// #if EDITOR

FlyText.__EDITOR_icon = 'tree/fly-text';
FlyText.__EDITOR_group = 'Extended';
FlyText.flyText.___EDITOR_isGoodForCallbackChooser = true;
FlyText.___EDITOR_isGoodForCallbackChooser = true;
FlyText.___EDITOR_isHiddenForDataChooser = true;

FlyText.flyText.___EDITOR_callbackParameterChooserFunction = () => {
	return editor.ui.modal.showPrompt('Enter text to show', 'Text-1', undefined, editor.validateCallbackParameter);
};
/// #endif