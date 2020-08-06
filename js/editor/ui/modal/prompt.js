let modalRejectProps = {className: 'modal-reject-text'};

export default class Prompt extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {value: props.defaultText || ''};
		this.onChange = this.onChange.bind(this);
		this.onAcceptClick = this.onAcceptClick.bind(this);
		this.onKeyDown = this.onKeyDown.bind(this);
	}
	
	componentDidMount() {
		setTimeout(() => {
			let input = document.querySelector('.modal-content input');
			if(input) {
				try {
					input.focus();
					input.setSelectionRange(0, input.value.length);
				} catch (er) {} // eslint-disable-line no-empty
			}
		}, 1);
		this.checkAcceptance(this.state.value);
	}
	
	onChange(ev) {
		let val = this.props.filter ? this.props.filter(ev.target.value) : ev.target.value;
		this.checkAcceptance(val);
	}
	
	checkAcceptance(val) {
		let reject = this.props.accept ? this.props.accept(val) : undefined;
		this.setState({
			value: val,
			rejectReason: reject,
			accepted: val && !reject
		});
	}
	
	onKeyDown(ev) {
		if (ev.keyCode === 13 && !this.props.multiline) {
			this.onAcceptClick();
		}
	}
	
	onAcceptClick() {
		if (this.state.accepted) {
			editor.ui.modal.hideModal(this.state.value);
		}
	}
	
	render() {
		let input = (this.props.multiline ? R.textarea : R.input);
		return R.fragment(
			R.div(modalRejectProps, this.state.rejectReason || ' '),
			R.div({className:'prompt-dialogue'},
				input({value: this.state.value, onKeyDown: this.onKeyDown, onChange: this.onChange})
			),
			R.btn('Ok', this.onAcceptClick, this.props.title, 'main-btn', this.props.multiline ? undefined : 13)
		);
	}
}