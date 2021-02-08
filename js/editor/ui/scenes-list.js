import Group from "./group.js";
import Lib from "thing-editor/js/engine/lib.js";
import game from "thing-editor/js/engine/game.js";
import Pool from "thing-editor/js/engine/utils/pool.js";
import Scene from "thing-editor/js/engine/components/scene.js";

let bodyProps = {className: 'list-view', title: 'Double click to open scene.'};

const sceneFileFiler = /^scenes\/.*\.scene.json$/gm;
const sceneExtRemover = /.scene.json$/gm;
const fileNameToSceneName = (fn) => {
	return fn.replace('scenes/', '').replace(sceneExtRemover, '');
};

const classNameProps = {className: 'scene-node-class'};
let sceneNameProps = {
	className: "selectable-text", title: 'Ctrl+click to copy scene`s name', onMouseDown: window.copyTextByClick
};

const sceneNameFilter = /[^a-z\-\/0-9]/g;


function askNewSceneName(defaultSceneName = '') {
	return editor.ui.modal.showPrompt('Enter name for scene:',
		defaultSceneName,
		(val) => { // filter
			return val.toLowerCase().replace(sceneNameFilter, '');
		},
		(val) => { //accept
			if (Lib.scenes.hasOwnProperty(val)) {
				return "Scene with such name already exists";
			}
			if (val.endsWith('/') || val.startsWith('/')) {
				return 'name can not begin or end with "/"';
			}
		}
	);
}


export default class ScenesList extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {};
		this.onSelect = this.onSelect.bind(this);
		this.onSaveAsSceneClick = this.onSaveAsSceneClick.bind(this);
		this.onNewSceneClick = this.onNewSceneClick.bind(this);
	}
	
	onSaveSceneClick() {
		editor.saveCurrentScene();
	}
	
	onSaveAsSceneClick() {
		let defaultSceneName = editor.currentSceneName.split('/');
		defaultSceneName.pop();
		defaultSceneName = defaultSceneName.join('/');
		if (defaultSceneName) {
			defaultSceneName += '/';
		}
		askNewSceneName(defaultSceneName).then((enteredName) => {
			if (enteredName) {
				editor.saveCurrentScene(enteredName);
				this.forceUpdate();
			}
		});
	}

	onNewSceneClick() {
		editor.askSceneToSaveIfNeed().then(() => {
			askNewSceneName().then((enteredName) => {
				if (enteredName) {
					editor.ui.modal.showListChoose("Select type for new scene:", editor.ClassesLoader.sceneClasses.map(i => i.c)).then((selectedClass) => {
						if(selectedClass) {
							Lib.__saveScene(Pool.create(selectedClass), enteredName);
							editor.openSceneSafe(enteredName).then(() => {
								if(editor.game.currentScene.__EDITOR_onCreate) {
									editor.game.currentScene.__EDITOR_onCreate();
								}
							});
							this.forceUpdate();
						}
					});
				}
			});
		});
	}

	onSceneDeleteClick(sceneName, view) {
		editor.ui.modal.showEditorQuestion('Are you sure?', R.span({className:'danger'},
			'Are you sure you want to delete scene: ',R.br(),R.br(), view, ' ?',
			R.br(),R.br(),
			'You cannot undo this action.'
		),() => {
			Lib.__deleteScene(sceneName);
			this.forceUpdate();
		}, 'Delete');
	}
	
	onSelect(item) {
		return item; //virtual method
	}
	
	renderItem(sceneName, item) {
		let cls = Lib.__hasClass(item.c) ? Lib.getClass(item.c) : Scene;
		let deleteBtn;
		if(sceneName === editor.currentSceneName) {
			this.state.selectedItem = item;
		} else {
			this.state.selectedItem = null;
			deleteBtn = R.btn(' ', () => {
				this.onSceneDeleteClick(sceneName, sceneView);
			}, 'Delete scene...', 'delete-scene-btn');
		}
		
		let sceneView = R.span(null,
			R.classIcon(cls),
			R.b(sceneNameProps, sceneName),
			R.span(classNameProps, ' (' + cls.name + ')')
		);
		
		return R.div({
			onDoubleClick: () => {
				if(editor.currentSceneName !== sceneName) {
					editor.ui.viewport.stopExecution();
					editor.openSceneSafe(sceneName);
				}
			},
			key: sceneName
		}, R.listItem(
			R.span(null,
				item.___libInfo ? item.___libInfo.icon : undefined,
				sceneView,
				deleteBtn
			), item, sceneName, this));
	}
	
	render() {
		let libsScenes = Lib._getAllScenes();
		let bottomPanelClassName = '';
		if (!editor.currentSceneName) {
			bottomPanelClassName += ' disabled';
		}
		
		let scenes = [];
		for (let sceneName in libsScenes) {
			scenes.push(this.renderItem(sceneName, libsScenes[sceneName]));
		}
		
		scenes = Group.groupArray(scenes);
		
		return R.fragment(
			R.div({className: bottomPanelClassName},
				R.btn('Save', this.onSaveSceneClick, 'Save current Scene (Ctrl + S)', undefined, 1083),
				R.btn('Save As...', this.onSaveAsSceneClick, 'Save current scene under new name.'),
				R.btn('+', this.onNewSceneClick, 'Create new scene.')
			),
			R.div(bodyProps, scenes)
		);
	}
	
	static chooseScene(title, noEasyClose, filterCurrent = true) {
		
		let libsScenes = Lib._getAllScenes();
		
		let scenes = [];
		for (let sceneName in libsScenes) {
			if(!filterCurrent || sceneName !== game.currentScene.name) {
				let sceneData = libsScenes[sceneName];
				let c = Lib.getClass(sceneData.c);
				scenes.push({name:sceneName, __EDITOR_icon: c.__EDITOR_icon});
			}
		}
		return editor.ui.modal.showListChoose(title || "Choose scene", scenes, noEasyClose).then((choosed) => {
			if(choosed) {
				return choosed.name;
			}
			return null;
		});
	}
	
	static readAllScenesList() {
		let scenes = {};
		return Promise.all(
			editor.fs.filesExt.scenes.filter(fn => fn.name.match(sceneFileFiler))
				.map((fn) => {
					return editor.fs.openFile(fn.name)
						.then((data) => {
							if(fn.lib) {
								data.___libInfo = R.libInfo(fn.lib);
							}
							scenes[fileNameToSceneName(fn.name)] = data;
						});
				})
		).then(() => {
			Lib._setScenes(scenes);
		});
	}
	
	static isSpecialSceneName(sceneName) {
		return sceneName.indexOf(editor.editorFilesPrefix) === 0;
	}
}

