const tipProps = {className:'tip-container'};

function renderTextBlock(t, i) {
	return R.div({className:'tip-paragraph', key:i, dangerouslySetInnerHTML:{__html:t}});
}

export default class Tip extends React.Component {
	
	constructor(props) {
		super(props);
		this.onDiscardClick = this.onDiscardClick.bind(this);
		this.onMouseDown = this.onMouseDown.bind(this);
	}
	
	onDiscardClick() {
		editor.settings.setItem('tip-discard-' + this.props.id, true);
		editor.ui.modal.hideModal();
	}
	
	onMouseDown() {
		editor.ui.modal.showModal(R.span(tipProps, R.btn('×', this.onDiscardClick, 'Discard this tooltip permanently', 'tip-discard-btn'),
			this.props.text.split('\n').map(renderTextBlock)
		), this.props.header);
	}
	
	render() {
		if(editor.settings.getItem('tip-discard-' + this.props.id)) {
			return R.span();
		}
		return R.span( {className:'tip-icon', onMouseDown: this.onMouseDown}, '?');
	}
}