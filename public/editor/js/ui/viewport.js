import Game from '/engine/js/game.js';
import PrefabsList from './prefabs-list.js';

const PLAY_ICON = R.icon('play');
const STOP_ICON = R.icon('stop');
var selectionData;

class Viewport extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {};
		this.onTogglePlay = this.onTogglePlay.bind(this);
	}
	
	stopExecution(reason) {
		if (reason) {
			editor.ui.modal.showError(reason);
		}
		if (!game.__EDITORmode) {
			this.onTogglePlay();
		}
	}
	
	onTogglePlay() {
		var play = game.__EDITORmode;
		
		if (play) { // launch game
			editor.saveCurrentScene(editor.runningSceneLibSaveSlotName);
			selectionData = editor.selection.saveSelection();
		} else { //stop game
			editor.loadScene(editor.runningSceneLibSaveSlotName);
			editor.selection.loadSelection(selectionData);
		}
		game.__EDITORmode = !play;
		this.forceUpdate();
		editor.history.updateUi();
	}

    setPrefabMode(enabled) {
	    this.setState({prefabMode:enabled});
    }
	
	render() {

        var className = 'editor-viewport-wrapper';

        var panel;
	    if(this.state.prefabMode) {
		    className += ' editor-viewport-wrapper-prefab-mode';
            panel = R.span( null,
                'Prefab edition mode: ', R.b(null, this.state.prefabMode),
                R.btn(R.icon('reject'), PrefabsList.hidePrefabPreview, 'Reject prefab changes'),
                R.btn(R.icon('accept'), PrefabsList.acceptPrefabEdition, 'Accept prefab changes', 'main-btn')
            )
        } else {
	        panel = R.span( undefined,
	            R.btn((!window.game || game.__EDITORmode) ? PLAY_ICON : STOP_ICON, this.onTogglePlay, 'Play/Stop (Space)', 'play-stop-btn', 32),
                R.btn(R.icon('recompile'), editor.reloadClasses, 'Rebuild game sources', 'play-stop-btn')
            )
        }


		return R.div({className},
			
			R.div({
				id: 'viewport-root',
				className: 'editor-viewport'
			}),
			
			R.div({className: 'editor-viewport-panel'},
                panel
			)
		);
	}
	
}

export default Viewport;