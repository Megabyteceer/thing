import DataPathFixer from "../utils/data-path-fixer.js";

const allHotkeyedButtons = [];
window.addEventListener("keydown", (ev) => {
	for(let b of allHotkeyedButtons) {
		if(b.onKeyDown(ev)) { //call only first button with this hotkey
			return;
		}
	}
});

const hotkeysBlockedWhenInputFocused = {
	8: true,
	13: true,
	37: true,
	38: true,
	39: true,
	40: true,
	46: true,
	90: true,
	188: true,
	190: true,
	1067: true,
	1088: true,
	1086: true
};
function isHotkeyBlockedOnInput(btn) {
	return btn.props.hotkey && hotkeysBlockedWhenInputFocused.hasOwnProperty(btn.props.hotkey);
}

class EditorButton extends React.Component {
	
	onKeyDown(e) {
		if(!this.props.hotkey) {
			return;
		}
		let needCtrl = this.props.hotkey > 1000;
		
		if (
			this.props.disabled || 
			(window.isEventFocusOnInputElement(e) && (isHotkeyBlockedOnInput(this))) ||
			((this.props.hotkey !== 112) && editor.ui.modal.isUIBlockedByModal(ReactDOM.findDOMNode(this))) // F1 - help hotkey works always
		) {
			return;
		}
		
		if ((e.keyCode === (this.props.hotkey % 1000)) && (needCtrl === e.ctrlKey)) {
			this.onMouseDown(e);
			sp(e);
			return true;
		}
	}

	constructor(props) {
		super(props);
		this.state = {};
		this.onKeyDown = this.onKeyDown.bind(this);
		this.onMouseDown = this.onMouseDown.bind(this);
	}
	
	UNSAFE_componentWillReceiveProps(props) {
		if(this.props.hotkey !== props.hotkey) {
			if(!props.hotkey && this.props.hotkey) {
				this.unregisterHotkey();
			} else if(props.hotkey && !this.props.hotkey) {
				this.registerHotkey();
			}
		}
	}

	componentDidMount() {
		if(this.props.hotkey) {
			this.registerHotkey();
		}
	}

	registerHotkey() {
		allHotkeyedButtons.unshift(this);
	}

	unregisterHotkey() {
		if(this.props.hotkey) {
			let i = allHotkeyedButtons.indexOf(this);
			if(i >= 0) {
				allHotkeyedButtons.splice(i, 1);
			}
		}
	}
	
	componentWillUnmount() {
		this.unregisterHotkey();
	}
	
	onMouseDown(ev) {
		if (ev.button === 2) {
			editor.ui.modal.showModal(this.props.onClick.name, "Button's Handler:");
		} else {
			if (this.props.disabled) return;
			DataPathFixer.onNameBlur();
			this.props.onClick(ev);
			ev.target.blur();
		}
		sp(ev);
	}
	
	render() {
		return R.button({
			disabled: this.props.disabled,
			className: (this.props.disabled ? 'unclickable ' : 'clickable ') + this.props.className,
			onMouseDown: this.onMouseDown,
			title: this.props.title,
			onClick: this.onClick
		}, this.props.label);
	}
}

export default EditorButton;