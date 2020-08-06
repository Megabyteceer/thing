const doNotDisturbHelpIdProps = {'data-do_not_disturb_helpid' : true};
const HELP_ROOT = 'https://github.com/Megabyteceer/thing-editor/wiki/';

let latestClickedHelpURL = HELP_ROOT;

window.addEventListener('mousedown', (ev) => {
	let t = ev.target;
	while(t) {
		if(t.dataset) {
			if(t.dataset.do_not_disturb_helpid) {
				return;
			}
			if(t.dataset.help) {
				Help.setCurrenHelp(t.dataset.help);
				return;
			}
		}
		t = t.parentNode;
	}
	latestClickedHelpURL = HELP_ROOT + 'editor.Overview';
}, true);

export default class Help extends React.Component {

	static openErrorCodeHelp(errorCode) {
		if(!errorCode) {
			errorCode = 90001;
		}
		editor.openUrl(HELP_ROOT + 'Error-Messages#' + errorCode);
	}

	static setCurrenHelp(url) {
		latestClickedHelpURL = url;
		if(!latestClickedHelpURL.startsWith('http')) {
			latestClickedHelpURL = HELP_ROOT + latestClickedHelpURL;
		}
	}

	render() {
		return R.span(doNotDisturbHelpIdProps, R.btn('Help (F1)', () => {
			editor.openUrl(latestClickedHelpURL);
		},
		'Click any element and then press (F1) to see its description.',
		'menu-btn',
		112
		));
	}
}