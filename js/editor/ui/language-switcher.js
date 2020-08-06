import L from "thing-editor/js/engine/utils/l.js";

const languageSwitcherProps = {className: 'language-switcher'};

export default class LanguageSwitcher extends React.Component {
	
	constructor(props) {
		
		super(props);
		this.onClickPrevLanguage = this.onClickPrevLanguage.bind(this);
		this.onClickNextLanguage = this.onClickNextLanguage.bind(this);
	}
	
	onClickPrevLanguage() {
		switchLanguage(-1);
		this.forceUpdate();
	}
	
	onClickNextLanguage() {
		switchLanguage(1);
		this.forceUpdate();
	}
	
	render() {
		return R.div(languageSwitcherProps,
			R.btn('◀', this.onClickPrevLanguage, undefined, 'tool-btn'),
			L.getCurrentLanguageId(),
			R.btn('▶', this.onClickNextLanguage, undefined, 'tool-btn')
		);
	}
	
	
}

function switchLanguage(direction) {
	let a = L.getLanguagesList();
	let i = a.indexOf(L.getCurrentLanguageId());
	i += direction;
	if(i < 0) i = a.length-1;
	if(i >= a.length) i = 0;
	L.setCurrentLanguage(a[i]);
}