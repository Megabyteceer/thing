import Prompt from './prompt.js';
import ChooseList from './choose-list.js';
import game from "thing-editor/js/engine/game.js";
import Help from 'thing-editor/js/editor/utils/help.js';
import ws from 'thing-editor/js/editor/utils/socket.js';

let modal;

let blackoutProps = {className: 'modal-blackout fadein-animation'};
let blackoutPropsClosable = {
	className: 'modal-blackout fadein-animation', style: {cursor: 'pointer'}, onMouseDown: (sp) => {
		if (sp.target.className.indexOf('modal-blackout') === 0) {
			modal.hideModal();
		}
	}
};

let spinnerProps = {className: 'modal-spinner'};
let bodyProps = {className: 'modal-body'};
let titleProps = {className: 'modal-title'};
let contentProps = {className: 'modal-content'};
let errorProps = {className: 'error'};
let notifyProps = {className: 'modal-notification'};
let notifyPropsDuringSpinner = {className: 'modal-notification modal-notification-centred'};

let notifyText;
let notifyInterval;

let spinnerShowCounter = 0;

let renderModal = (props, i) => {
	let title;
	
	if (props.title) {
		title = R.div(titleProps, props.title);
	}
	
	return R.div({key: i},
		R.div(props.noEasyClose ? blackoutProps : blackoutPropsClosable,
			R.div(bodyProps,
				title,
				R.div(contentProps,
					props.content
				)
			)
		)
	);
};

let renderSpinner = () => {
	return R.div(blackoutProps,
		R.div(spinnerProps)
	);
};

class Modal extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {
			modals: []
		};
	}

	isUIBlockedByModal(element) {
		if(spinnerShowCounter > 0) {
			return true;
		}
		if(this.state.modals.length > 0) {
			let topModal = document.querySelectorAll('.modal-body');
			topModal = topModal[topModal.length -1];
			return !topModal.contains(element) && !element.classList.contains('modal-close-button');
		}
		return false;
	}
	
	hideModal(val) {
		assert(modal.state.modals.length > 0, 'tried to close modal dialogue, but no one opened.');
		let closedModalItem = modal.state.modals.pop();
		modal.forceUpdate();
		closedModalItem.resolve(val);
	}
	
	showModal(content, title, noEasyClose, toBottom = false) {
		if(document.activeElement) {
			document.activeElement.blur();
		}
		return new Promise((resolve) => {
			modal.state.modals[toBottom ? 'unshift' : 'push']({content, title, noEasyClose, resolve});
			modal.forceUpdate();
		});
	}

	showInfo(message, title, errorCode) {
		this.showModal(message, errorCode ?
			R.span(null, R.icon('info'), errorCode, ' ', title, R.btn('?', () => {
				Help.openErrorCodeHelp(errorCode);
			}, 'Open docs for this message (F1)', 'error-help-button', 112))
			: title
		);
	}

	notify(txt) {
		notifyText = txt;
		if(notifyInterval) {
			clearInterval(notifyInterval);
			notifyInterval = false;
		}
		if(txt) {
			notifyInterval = setInterval(() => {
				this.notify();
			}, 1000);
		}
		this.forceUpdate();
	}
	
	componentDidMount() {
		assert(!modal, 'Modal already mounted.');
		modal = this;
	}
	
	showSpinner() {
		spinnerShowCounter++;
		if (spinnerShowCounter === 1) {
			modal.forceUpdate();
		}
	}
	
	hideSpinner() {
		spinnerShowCounter--;
		if (spinnerShowCounter === 0) {
			setTimeout(() => {
				modal.forceUpdate();
			}, 10);
		}
	}
	
	showEditorQuestion(title, message, onYes, yesLabel = 'Ok', onNo, noLabel = 'Cancel', noEasyClose) {
		
		let yesBtn = R.btn(yesLabel, () => {
			modal.hideModal(true);
			if(onYes) {
				onYes();
			}
		}, undefined, 'main-btn', 13);
		
		let noBtn;
		if (typeof onNo !== 'undefined') {
			noBtn = R.btn(noLabel, () => {
				modal.hideModal();
				onNo();
			});
		}
		
		return this.showModal(R.div(null, message,
			R.div(null,
				yesBtn,
				noBtn
			)
		), title, noEasyClose);
	}
	
	showPrompt(title, defaultText, filter, accept, noEasyClose, multiline) {
		return this.showModal(React.createElement(Prompt, {defaultText, filter, accept, multiline}), title, noEasyClose);
	}
	
	showListChoose(title, list, noEasyClose, noSearchField) {
		return this.showModal(React.createElement(ChooseList, {list, noSearchField}), title, noEasyClose);
	}
	
	showError(message, errorCode, title = 'Error!', noEasyClose, toBottom) {
		if(editor.buildProjectAndExit) {
			if(typeof message === 'object') {
				try {
					let txt = [];
					JSON.stringify(message, (key, value) => {
						if(key !== 'type' && typeof value === 'string') {
							txt.push(value);	
						}
						return value;
					});
					message = txt.join('\n');
				} catch (er) {} // eslint-disable-line no-empty
			}
			ws.exitWithResult(undefined, (editor.buildProjectAndExit ? ('Build failed: ' + editor.buildProjectAndExit.projectName + '\n') : '') + message + '; Error code: ' + errorCode);
		} else {
			if(game.stage) {
				setTimeout(editor.ui.viewport.stopExecution, 0);
			}
			return this.showModal(R.div(errorProps, R.multilineText(message)), R.span(null, R.icon('error'), errorCode, ' ', title, R.btn('?', () => {
				Help.openErrorCodeHelp(errorCode);
			}, 'Open docs for this error (F1)', 'error-help-button', 112)), noEasyClose, toBottom);
		}
	}
	
	showFatalError(message, errorCode, additionalText = 'FatalError. Please check console output (F12) for exceptions messages, and restart application (Reload page) by press (F5) button. If any unsaved changes in current scene, it will ask you to restore automatic created backup.') {
		editor.__FatalError = true;
		this.showError(R.div(null, R.div(null, R.b(null, message)), additionalText), errorCode, 'FatalError', true, true);
	}
	
	render() {
		let spinner;
		if (spinnerShowCounter > 0) {
			spinner = renderSpinner();
		}

		let notify;
		if(notifyText) {
			notify = R.div(spinner ? notifyPropsDuringSpinner : notifyProps, notifyText);
		}

		let hotkeyButton;
		if(this.state.modals.length > 0) {
			hotkeyButton = R.btn('х', () => {
				let m = modal.state.modals[modal.state.modals.length - 1];
				if (m && !m.noEasyClose) {
					modal.hideModal();
				}
			}, undefined, "modal-close-button hidden", 27);
		}
		return R.fragment(this.state.modals.map(renderModal), spinner, notify, hotkeyButton);
	}
}

export default Modal;