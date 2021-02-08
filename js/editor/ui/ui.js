import Window from './window.js';
import TreeView from './tree-view/tree-view.js';
import Viewport from './viewport.js';
import PropsEditor from './props-editor/props-editor.js';
import EditorButton from './editor-button.js';
import Modal from './modal/modal.js';
import ClassesView from './classes-view.js';
import ScenesList from "./scenes-list.js";
import PrefabsList from "./prefabs-list.js";
import LanguageView from "./language-view.js";
import Status from "./status.js";
import game from "thing-editor/js/engine/game.js";
import SoundsList from './sounds-list.js';
import TexturesView from './textures-view.js';
import Help from '../utils/help.js';

/**
 *
 * @param label
 * @param onClick
 * @param title
 * @param className
 * @param hotkey
 * @param disabled
 * @return {Element}
 */
R.btn = function (label, onClick, title = undefined, className = undefined, hotkey = false, disabled = false) {
	assert(onClick, "Function as onClick handler expected.");
	className = className || '';
	return React.createElement(EditorButton, {label, onClick, className, title, hotkey, disabled});
};

function renderWindow(id, helpId, title, content, x, y, minW, minH, w, h, onResize) {
	return React.createElement(Window, {id, helpId, title, content, x, y, minW, minH, w, h, onResize});
}

class UI extends React.Component {
	
	
	constructor(props) {
		super(props);
		
		this.renderWindow = renderWindow;
		
		this.statusRef = this.statusRef.bind(this);
		this.sceneTreeRef = this.sceneTreeRef.bind(this);
		this.propsEditorRef = this.propsEditorRef.bind(this);
		this.viewportRef = this.viewportRef.bind(this);
		this.modalRef = this.modalRef.bind(this);
		this.prefabsRef = this.prefabsRef.bind(this);
		this.classesListRef = this.classesListRef.bind(this);
		this.soundsListRef = this.soundsListRef.bind(this);

		this.LanguageView = LanguageView;
	}
	
	componentDidMount() {
		this.props.onMounted(this);
	}
	/** @param ref {Status} */
	statusRef(ref) {
		this.status = ref;
	}
	/** @param ref {TreeView} */
	sceneTreeRef(ref) {
		this.sceneTree = ref;
	}
	/** @param ref {ClassesView} */
	classesListRef(ref) {
		this.classesList = ref;
	}
	/** @param ref {SoundsList} */
	soundsListRef(ref) {
		this.soundsList = ref;
	}
	/** @param ref {PrefabsList} */
	prefabsRef(ref) {
		this.prefabsList = ref;
	}
	/** @param ref {Viewport} */
	viewportRef(ref) {
		this.viewport = ref;
	}
	/** @param ref {PropsEditor} */
	propsEditorRef(ref) {
		this.propsEditor = ref;
	}
	/** @param ref {Modal} */
	modalRef(ref) {
		this.modal = ref;
	}

	onBuildClick() {
		editor.build();
	}

	onBuildDebugClick() {
		editor.build(true);
	}
	
	onOpenProjectClick() {
		editor.fs.chooseProject();
	}
	
	onOpenProjectFolderClick() {
		editor.fs.editFile('/games/' + editor.currentProjectDir);
	}
	
	render() {

		editor.fs.filesExt && editor.fs.filesExt.scripts.sort((a, b) => {
			return (a.name > b.name) ? 1 : -1;
		});

		return R.div({"data-help": 'editor.MainMenu'},
			R.btn('Open project...', this.onOpenProjectClick, undefined, 'menu-btn'),
			R.btn('Browse...', this.onOpenProjectFolderClick, "Reveal in File Explorer", 'menu-btn'),
			R.btn('Build', this.onBuildClick, "Build release version of game.", 'menu-btn'),
			R.btn('Build debug', this.onBuildDebugClick, "Build debug version of game.\nContains asserts.", 'menu-btn'),
			React.createElement(LanguageView),
			React.createElement(TexturesView),
			editor.history.buttonsRenderer(),
			R.btn('Project settings', editor.openProjectDescToEdit, undefined, 'menu-btn'),
			editor.__preBuildAutoTest && R.btn('Test', editor.testProject, "Launch auto-tests", 'menu-btn'),
			React.createElement(Help),
			editor.fs.filesExt && editor.fs.filesExt.scripts.map((s) => {
				return R.span({key: s.name}, R.btn(s.name.replace('scripts/', '').replace(/\.js$/, ''), () => {
					editor.fs.exec(s.name);
				}, undefined, 'menu-btn'));
			}),

			renderWindow('sceneTree', 'SceneTree', 'Scene tree', React.createElement(TreeView, {ref: this.sceneTreeRef}), 0, 35, 250, 500, 250, 500),
			renderWindow('viewport', 'Viewport', R.span(null, 'Viewport: ', editor.projectDesc ? R.b(null, editor.currentSceneName) : undefined, React.createElement(StatusBar)), React.createElement(Viewport, {ref: this.viewportRef}),
				558, 0, 470, 535, 1362, 742, ()=>{
					if(game.projectDesc) {
						game._onContainerResize();
					}
				}),
			renderWindow('propsEditor', 'Properties', 'Properties', React.createElement(PropsEditor, {
				ref: this.propsEditorRef,
				onChange: editor.onSelectedPropsChange
			}), 255, 35, 250, 250, 250, 500),
			renderWindow('classesLib', 'Classes', 'Classes', React.createElement(ClassesView, {ref: this.classesListRef}), 0, 550, 320, 150, 320, 470),
			renderWindow('prefabsList', 'Prefabs', 'Prefabs', React.createElement(PrefabsList, {ref: this.prefabsRef}), 325, 550, 260, 150, 250, 470),
			renderWindow('scenesList', 'Scenes', 'Scenes', React.createElement(ScenesList), 1560, 750, 200, 100, 360, 260),
			renderWindow('soundsList', 'Sounds', 'Sounds', React.createElement(SoundsList, {ref: this.soundsListRef}), 1194, 750, 200, 100, 360, 260),
			
			React.createElement(Status, {ref: this.statusRef}),
			React.createElement(Modal, {ref: this.modalRef})
		);
	}
}

export default UI;

class StatusBar extends React.Component {
	
	componentDidMount() {
		this.forceUpdate = () => this.forceUpdate();
		window.addEventListener('mousedown', this.forceUpdate);
		window.addEventListener('mousemove', this.forceUpdate);
		window.addEventListener('wheel', this.forceUpdate);
	}

	componentWillUnmount() {
		window.removeEventListener('mousedown', this.forceUpdate);
		window.removeEventListener('mousemove', this.forceUpdate);
		window.removeEventListener('wheel', this.forceUpdate);
	}

	render() {
		if(game && game.stage) {
			let txt = ' x: ' + game.mouse.__EDITOR_scene_x + ' y: ' + game.mouse.__EDITOR_scene_y;
			
			if(editor.selection.length > 0) {
				let p = editor.selection[0].toLocal(game.__mouse_EDITOR);
				txt += ' (x: ' + Math.round(p.x - editor.selection[0].pivot.x) + '; y: ' + Math.round(p.y - editor.selection[0].pivot.y) + ')';
			}
			
			let resetZoomBtn;
			if(game.stage) {
				if(game.stage.scale.x !== 1) {
					txt += ' zoom: ' + game.stage.scale.x;
				}
				if(game.stage.scale.x !== 1 || game.stage.x !== 0 || game.stage.y !== 0) {
					resetZoomBtn = R.btn('x', editor.ui.viewport.resetZoom, 'Reset zoom and viewport position (Ctrl + double-click on viewport)', 'reset-zoom-btn');
				}
			}
			editor.overlay.refreshCameraFrame();
			return R.span(null, resetZoomBtn, txt);
		}
		return R.span();
	}
}
