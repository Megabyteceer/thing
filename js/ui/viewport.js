import PrefabsList from './prefabs-list.js';
import Lib from "thing-engine/js/lib.js";
import Signal from "../utils/signal.js";
import LanguageSwitcher from "./language-switcher.js";
import game from "thing-engine/js/game.js";
import Sound from 'thing-engine/js/utils/sound.js';
import Keys from 'thing-engine/js/utils/keys.js';
import ClassesView from './classes-view.js';
import Spine from 'thing-engine/js/components/spine.js';
import SelectEditor from './props-editor/select-editor.js';

const PLAY_ICON = R.icon('play');
const STOP_ICON = R.icon('stop');
const PAUSE_ICON = R.icon('pause');

const SCROLL_IN_TO_SCREEN_FIELD = 0;

let prefabTitleProps = {className: 'prefabs-mode-title'};
let prefabLabelProps = {
	className: 'selectable-text',
	title: 'Ctrl+click to copy prefab`s name',
	onMouseDown: window.copyTextByClick
};

const SPEED_SELECT = [0.1, 0.25, 0.5, 1, 2, 4, 8, 16, 32].map((value) => {
	return { value, name : '×' + value};
});

let stoppingExecutionTime;
let playTogglingTime;
let recoveryCheckingTime;
let problemOnGameStart,
	problemOnGameStop;

document.addEventListener('fullscreenchange', () => {
	game.onResize();
});

export default class Viewport extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {};
		this.onTogglePlay = this.onTogglePlay.bind(this);
		this.onPauseResumeClick = this.onPauseResumeClick.bind(this);
		this.stopExecution = this.stopExecution.bind(this);
		this.onOneStepClick = this.onOneStepClick.bind(this);
		this.beforePlayStopToggle = new Signal();
		this.onHelpersToggle = this.onHelpersToggle.bind(this);
		this.helpersHidden = false;
	}

	onHelpersToggle() {
		this.helpersHidden = !this.helpersHidden;
		editor.overlay.hideHelpers(this.helpersHidden);
	}
	
	stopExecution() {
		if(!stoppingExecutionTime) {
			editor.exitPrefabMode();
			stoppingExecutionTime = true;
			if(!game.__EDITORmode) {
				this.onTogglePlay();
			}
			stoppingExecutionTime = false;
		}
	}

	
	resetZoom() {
		game.stage.scale.x = 1;
		game.stage.scale.y = 1;
		game.stage.x = 0;
		game.stage.y = 0;
	}
	
	checkIfNeedRecovery() {
		if(!recoveryCheckingTime) {
			recoveryCheckingTime = true;
			setTimeout(() => {
				recoveryCheckingTime = false;
				if(problemOnGameStart || problemOnGameStop || editor.frameUpdateException) {
					
					playTogglingTime = false;
					
					if(problemOnGameStop) {
						problemOnGameStop = false;
						editor.ui.modal.showFatalError('Exception on game stopping.', 20001);
					}
					if(problemOnGameStart) {
						problemOnGameStart = false;
						editor.ui.modal.showFatalError('Exception on game starting.', 20002);
					}
					if(editor.frameUpdateException) {
						editor.frameUpdateException = false;
						editor.ui.modal.showFatalError('Exception on frame update.', 20003);
					}
				}
			}, 0);
		}
	}
	
	onTogglePlay() {
		if(!playTogglingTime && !editor.__FatalError) {
			Keys.resetAll();
			this.checkIfNeedRecovery();
			playTogglingTime = true;
			
			this.resetZoom();
			game.__doOneStep = false;
			game.__paused = false;
			let play = game.__EDITORmode;
			this.beforePlayStopToggle.emit(play);
			game.__time = 0;
			delete game.__EDITORsceneDataWaitongToStart;
			game.data = {};
			if(play) { // launch game
				editor.ui.status.clear();
				problemOnGameStart = true;
				editor.saveHistoryNow();
				
				editor.saveBackup(true);
				game.__EDITORselectionDataWaitingToSelect = editor.selection.saveSelection();
				game.__EDITORsceneDataWaitongToStart = Lib.__serializeObject(game.currentScene);
				game.__clearStage();
				Spine.clearPool();
				Sound.__resetSounds();
				game.__EDITORmode = false;
				game._setCurrentScene(null);
				game.showScene(editor.currentSceneName);
				problemOnGameStart = false;
				game.stage.interactiveChildren = true;
			} else { //stop game
				problemOnGameStop = true;
				game.__EDITOR_game_stopping = true;
				game.__clearStage();
				game.__EDITORmode = true;
				Sound.__resetSounds();
				editor.restoreBackup(true);
				game.__EDITOR_game_stopping = false;
				problemOnGameStop = false;
				game.stage.interactiveChildren = false;
			}
			
			this.forceUpdate();
			editor.history.updateUi();
			
			game.pixiApp.ticker._requestIfNeeded(); //restore broken ticker if necessary.
			
			playTogglingTime = false;
			game.onResize();
		}
	}

	scrollInToScreen(node) {
		let b = node.getBounds();
		if(b.width === 0 && b.height === 0) {
			node.getGlobalPosition(b);
		}

		let w = b.width / 4;
		let h = b.height / 4;

		b.x += w;
		b.width -= w * 2;
		b.y += h;
		b.height -= h * 2;

		if(b.right < SCROLL_IN_TO_SCREEN_FIELD) {
			game.stage.x -= b.right - SCROLL_IN_TO_SCREEN_FIELD;
		} else if(b.left > game.W - SCROLL_IN_TO_SCREEN_FIELD) {
			game.stage.x -= b.left - (game.W - SCROLL_IN_TO_SCREEN_FIELD);
		}

		if(b.bottom < SCROLL_IN_TO_SCREEN_FIELD) {
			game.stage.y -= b.bottom - SCROLL_IN_TO_SCREEN_FIELD;
		} else if(b.top > game.H - SCROLL_IN_TO_SCREEN_FIELD) {
			game.stage.y -= b.top - (game.H - SCROLL_IN_TO_SCREEN_FIELD);
		}
	}
	
	onPauseResumeClick() {
		game.__paused = !game.__paused;
		this.forceUpdate();
	}
	
	onOneStepClick() {
		game.__doOneStep = true;
		this.forceUpdate();
	}
	
	setPrefabMode(enabled) {
		this.setState({prefabMode: enabled});
	}
	
	onReloadClassesClick() {
		editor.ui.status.clear();
		editor.reloadClasses();
	}
	
	onToggleOrientationClick() {
		game.__enforcedOrientation = (game.__enforcedOrientation === 'portrait') ? 'landscape' : 'portrait';
	}
	
	onReloadAssetsClick() {
		editor.ui.status.clear();
		editor.fs.refreshFiles().then(() => {
			editor.reloadAssets();
		});
	}
	
	render() {
		
		let className = 'editor-viewport-wrapper';
		let statusHeader;
		let panel;
		
		let toggleOrientationBtn;
		if(game && game.projectDesc && (game.projectDesc.screenOrientation === 'auto')) {
			toggleOrientationBtn = R.btn(R.icon('orientation-toggle'), this.onToggleOrientationClick, 'Switch screen orientation (Ctrl + O)', 'big-btn', 1079);
		}

		let reloadAssetsBtn = R.btn(R.icon('reload-assets'), this.onReloadAssetsClick, 'Reload game assets', 'big-btn');
		
		if(this.state.prefabMode) {
			className += ' editor-viewport-wrapper-prefab-mode';
			panel = R.span(null,
				R.div(prefabTitleProps, 'Prefab: ', R.br(), R.b(prefabLabelProps, this.state.prefabMode)),
				R.btn(R.icon('accept'), PrefabsList.acceptPrefabEdition, 'Accept prefab changes (Enter)', 'main-btn', 13),
				R.btn(R.icon('reject'), () => {
					if(editor.isCurrentContainerModified) {
						editor.ui.modal.showEditorQuestion("Are you sure?", "Are you really wanted to discard all changes made in prefab?", PrefabsList.hidePrefabPreview, "Discard changes.");
					} else {
						PrefabsList.hidePrefabPreview();
					}
				}, 'Reject prefab changes (Esc)', undefined, 27),
				'BG color:',
				R.input({
					onChange: (ev) => {
						editor.overlay.setBGcolor(parseInt(ev.target.value.replace('#', ''), 16));
					},
					className: 'clickable',
					type: 'color',
					defaultValue: '#' + editor.overlay.getBGcolor().toString(16).padStart(6, '0')
				}),
				reloadAssetsBtn,
				toggleOrientationBtn
			);
		} else {
			let pauseResumeBtn, oneStepBtn;
			if(game && !game.__EDITORmode) {
				pauseResumeBtn = R.btn(game.__paused ? PLAY_ICON : PAUSE_ICON, this.onPauseResumeClick, "Pause/Resume (Ctrl + P)", 'big-btn', 1080);
				if(game.__paused) {
					statusHeader = 'paused';
					oneStepBtn = R.btn('One step', this.onOneStepClick, "(Ctrl + [)", undefined, 1219);
				} else {
					statusHeader = 'running';
				}
			}
			panel = R.span(undefined,
				R.btn((!game || game.__EDITORmode) ? PLAY_ICON : STOP_ICON, this.onTogglePlay, 'Play/Stop (Ctrl + Space)', 'big-btn', 1032),
				R.btn(R.icon('recompile'), this.onReloadClassesClick, 'Reload Custom Components', 'big-btn'),
				reloadAssetsBtn,
				statusHeader,
				pauseResumeBtn,
				oneStepBtn,
				toggleOrientationBtn,
				R.btn('⛶', () => {
					document.querySelector('#viewport-root').requestFullscreen();
				}, 'Go fullscreen'),
				'Speed:',
				React.createElement(SelectEditor, {onChange:(ev) => {
					game.__speedMultiplier = ev.target.value;
					this.forceUpdate();
				}, value: game.__speedMultiplier, select: SPEED_SELECT})
			);
		}
		
		let languagePanel = React.createElement(LanguageSwitcher);
		
		return R.div({className},
			R.div({className: 'editor-viewport-panel'},

				R.btn("toggle helpers", () => {
					document.querySelector('#helpers-checkbox').click();
				}, undefined, "hidden", 1072),
				R.input({id:"helpers-checkbox", className:'clickable', type:'checkbox', title: "Hide helpers (Ctrl + H)", onChange: this.onHelpersToggle, defaultChecked:this.helpersHidden}),

				languagePanel,
				panel
			),
			R.div({
				id: 'viewport-root',
				className: 'editor-viewport',
				onDoubleClick: (ev) => {
					if(ev.ctrlKey) {
						this.resetZoom();
					}
				},
				onDragOver: (ev) => {
					if (canBeDragAccepted(ev)) {
						ev.dataTransfer.effectAllowed = "copy";
						ev.dataTransfer.dropEffect = "copy";
						ev.preventDefault();
					}
				},
				onDrop: (ev) => {
					let i = canBeDragAccepted(ev);
					if(i) {
						let b = ev.target.getBoundingClientRect();
						let scale = b.width / ev.target.width;
						let p = {
							x: (ev.clientX - b.left) / scale,
							y: (ev.clientY - b.top) / scale
						};

						i.getAsString((imageId) => {
							let o = ClassesView.loadSafeInstanceByClassName('DSprite');
							o.image = imageId;

							game.stage.toLocal(p, undefined, o);
							editor.addToScene(o);
							o.x = Math.round(o.x);
							o.y = Math.round(o.y);
						});
					}
					ev.preventDefault();
				}
			})
		);
	}
}

function canBeDragAccepted(ev) {
	for(let i of ev.dataTransfer.items) {
		if(i.type ==="text/thing-editor-image-id") {
			return i;
		}
	}
}