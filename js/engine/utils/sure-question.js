import game from "../game.js";
import callByPath from "./call-by-path.js";
import L from "./l.js";

export default class SureQuestion {

	static init(clip, title, message, yesLabel, onYes, noLabel, onNo, easyClose) {
		
		const onYesHandler = () => {
			game.hideModal(clip);
			if (onYes) {
				if(typeof onYes === 'string') {
					callByPath(onYes, this);
				} else {
					onYes();
				}
			}
		};
		const onNoHandler = () => {
			game.hideModal(clip);
			if (onNo) {
				if(typeof onNo === 'string') {
					callByPath(onNo, this);
				} else {
					onNo();
				}
			}
		};

		let btn = clip.findChildByName('easyCloseBtn');
		if(btn) {
			if(!easyClose) {
				btn.disable();
			} else {
				btn.callback = onNoHandler;
			}
		}

		if ((typeof title) === 'string') {
			let tf = clip.findChildByName('title');
			if(tf) {
				tf.text = title;
			}
		}
		if ((typeof message) === 'string') {
			let tf = clip.findChildByName('message');
			if(tf) {
				tf.text = message;
			}
		}
		
		let okBtn = clip.findChildByName('okBtn');
		if (okBtn) {
			if(yesLabel) {
				let tf = okBtn.findChildByName('label');
				if(tf) {
					if(L.has(yesLabel)) {
						tf.translatableText = yesLabel;
					} else {
						tf.text = yesLabel;
					}
				}
			}
			okBtn.callback = onYesHandler;
		}
		
		let noBtn = clip.findChildByName('noBtn');
		if(noBtn) {
			if(noLabel) {
				let tf = noBtn.findChildByName('label');
				if(tf) {
					if(L.has(noLabel)) {
						tf.translatableText = noLabel;
					} else {
						tf.text = noLabel;
					}
				}
			}
			
			if(noLabel || (onNo && !easyClose)) {
				noBtn.callback = onNoHandler;
			} else {
				noBtn.visible = false;
				okBtn.x = (okBtn.x + noBtn.x) / 2; //Centralize ok button
			}
		}
	}
}