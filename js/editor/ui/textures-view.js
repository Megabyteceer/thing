import Lib from "thing-editor/js/engine/lib.js";
import group from "./group.js";
import Window from "./window.js";
import SelectEditor from "./props-editor/select-editor.js";
import game from "thing-editor/js/engine/game.js";

const FILTER_ALL =      1000000000;
const DEFAULT_LOADING = 0;

let view;

const LOADING_TYPES = [
	{
		name:'default',
		value:DEFAULT_LOADING
	},
	{
		name:'On Demand',
		value: 1
	},
	{
		name:'Early Precache',
		value: 2
	}
];

const FILTER_SELECT = LOADING_TYPES.slice();
FILTER_SELECT.unshift({
	name: 'All',
	value: FILTER_ALL
});

let labelProps = {
	className: 'selectable-text',
	title: 'Ctrl+click to copy texture`s name',
	onMouseDown: window.copyTextByClick
};

const isParentFolderPropsDefined = (path) => {
	for(let f in editor.projectDesc.__loadOnDemandTexturesFolders) {
		if(path.startsWith(f + '/')) {
			return editor.projectDesc.__loadOnDemandTexturesFolders[f];
		}
	}
};

export default class TexturesView extends React.Component {

	static refresh() {
		if(view) {
			view.forceUpdate();
		}
	}

	constructor(props) {
		super(props);
		this.state = {};
		this.onToggleClick = this.onToggleClick.bind(this);
	}

	onToggleClick() {
		let t = !this.state.toggled;
		this.setState({
			toggled: t
		});
	}

	static applyFoldersPropsToAllImages() {
		for(let i of Lib.__texturesList) {
			let name = i.value;
			let folderProps = isParentFolderPropsDefined(name);
			if(typeof folderProps === 'number') {
				game.__setTextureSettingsBits(name, folderProps, 3);
			}
		}
	}

	render() {
		let btn = R.btn('Textures (Ctrl+U)', this.onToggleClick, undefined, this.state.toggled ? 'menu-btn toggled-button' : 'menu-btn', 1085);
		let table;
		if (this.state.toggled) {
			table = editor.ui.renderWindow('texturesviewer', 'Textures', 'Textures Viewer', R.fragment(
				R.btn('×', this.onToggleClick, 'Hide Textures Viewer', 'close-window-btn'),
				React.createElement(TexturesViewerBody)), 200, 100, 620, 300, 900, 800);
		}
		return R.fragment(btn, table);
	}
}

class TexturesViewerBody extends React.Component {

	constructor(props) {
		super(props);
		this.renderItem = this.renderItem.bind(this);
		this.imagesRoot = '/games/' + editor.currentProjectDir + 'img/';
		this.state = {filter: FILTER_ALL};
		this.refreshView = this.refreshView.bind(this);
		this.checkForUnusedImages = this.checkForUnusedImages.bind(this);
	}

	refreshView() {
		this.forceUpdate();
	}

	componentDidMount() {
		view = this;
		Window.bringWindowForward('#window-texturesviewer', true);
	}

	componentWillUnmount() {
		view = null;
	}

	renderItem(item) {
		let name = item.value;
		
		let isOnDemandLoading = game._getTextureSettingsBits(name, 3);

		let onDemandSwitcher;
		
		let folderProps = isParentFolderPropsDefined(name);
		if(!folderProps) {
			onDemandSwitcher = R.span({
				className: 'texture-preload-checkbox',
				title: 'Texture preloading mode'
			},
			React.createElement(SelectEditor, {onChange:(ev) => {
				if(isOnDemandLoading !== ev.target.value) {
					game.__setTextureSettingsBits(name, ev.target.value, 3);
					if(ev.target.value !== DEFAULT_LOADING) {
						game.__loadDynamicTextures();
					} else {
						game.__loadImagesIfUnloaded([name]);
					}
					this.setState({filter: FILTER_ALL});
					this.forceUpdate();
				}
			}, noCopyValue:true, value:isOnDemandLoading, select: LOADING_TYPES}),
			);
		} else {
			if(isOnDemandLoading != folderProps) {
				game.__setTextureSettingsBits(name, folderProps, 3);
				window.debouncedCall(this.refreshView);
				window.debouncedCall(game.__loadDynamicTextures);
			}
		}

		let size;
		let isPowOf2;
		if(Lib.hasTexture(name)) {
			let texture = Lib.getTexture(name);
			if(texture.__noIncludeInToBuild) {
				return undefined;
			}
			size = texture.width + 'x' + texture.height;
			isPowOf2 = texture.baseTexture.isPowerOfTwo;
		} else {
			size = '(unloaded)';
		}
		let path = this.getImagePath(name);
		
		return R.div({key:name, className:isOnDemandLoading ? 'textures-viewer-item red-frame' : 'textures-viewer-item'},
			R.img({src: path, className:'textures-viewer-image', onDoubleClick:() => {
				editor.fs.editFile(path.split('?')[0]);
			},
			onDragStart(ev) {
				ev.dataTransfer.setData("text/thing-editor-image-id", name);
			}
			}),
			R.b(labelProps, name),
			R.br(),
			size,
			onDemandSwitcher,
			game.projectDesc.mipmap ? undefined : R.input({className:'clickable texture-mipmap-check', type:'checkbox', title: "generate Mip-Maps",
				onChange: (ev) => {
					let isMipMaps = ev.target.checked;
					game.__setTextureSettingsBits(name, isMipMaps ? 4 : 0, 4); //99999
					if(Lib.hasTexture(name)) {
						let baseTexture = Lib.getTexture(name).baseTexture;
						baseTexture.mipmap = isMipMaps ? PIXI.MIPMAP_MODES.ON : PIXI.MIPMAP_MODES.OFF;
						baseTexture.update();
					}
				},
				defaultChecked: game._getTextureSettingsBits(name, 4)}
			),
			isPowOf2 ? R.input({className:'clickable texture-mipmap-check', type:'checkbox', title: "wrap texture",
				onChange: (ev) => {
					let isWrap = ev.target.checked;
					game.__setTextureSettingsBits(name, isWrap ? 8 : 0, 24);//99999
					if(Lib.hasTexture(name)) {
						let baseTexture = Lib.getTexture(name).baseTexture;
						baseTexture.wrapMode = isWrap ? PIXI.WRAP_MODES.REPEAT : PIXI.WRAP_MODES.CLAMP;
						baseTexture.update();
					}
					this.forceUpdate();
				},
				checked: game._getTextureSettingsBits(name, 8)}
			) : undefined,
			isPowOf2 ? R.input({className:'clickable texture-mipmap-check', type:'checkbox', title: "mirror-wrap texture",
				onChange: (ev) => {
					let isWrap = ev.target.checked;
					game.__setTextureSettingsBits(name, isWrap ? 16 : 0, 24);
					if(Lib.hasTexture(name)) {
						let baseTexture = Lib.getTexture(name).baseTexture;
						baseTexture.wrapMode = isWrap ? PIXI.WRAP_MODES.MIRRORED_REPEAT : PIXI.WRAP_MODES.CLAMP;
						baseTexture.update();
					}
					this.forceUpdate();
				},
				checked: game._getTextureSettingsBits(name, 16)}
			): undefined
		);
	}

	getImagePath(name) {
		return this.imagesRoot + name;
	}

	render() {
		let list = Lib.__texturesList;
		if(this.state.filter !== FILTER_ALL) {
			let filter = this.state.filter;
			list = list.filter((t) => {
				return (editor.projectDesc.loadOnDemandTextures[t.name] || DEFAULT_LOADING) === filter;
			});
		}
		list = list.map(this.renderItem).filter(i => i);
		let folders = {};
		for(let i of list) {
			let folderName = i.key.substring(0, i.key.lastIndexOf('/'));
			if(folderName) {
				folders[folderName] = true;
			}
		}
		for(let folderName in folders) {
			if(!isParentFolderPropsDefined(folderName)) {
				list.unshift(R.div({className:'folder-loading-settings', title:"Folder preloading mode", key: folderName +'/ folder-props ::'},
					React.createElement(SelectEditor, {onChange:(ev) => {
						let opt = editor.projectDesc.__loadOnDemandTexturesFolders;
						if(opt[folderName] !== ev.target.value) {
							if(ev.target.value !== DEFAULT_LOADING) {
								let a = Object.keys(opt);
								for(let f of a) {
									if(f.startsWith(folderName + '/')) {
										delete opt[f];
									}
								}
								opt[folderName] = ev.target.value;
								editor.saveProjectDesc();
							} else {
								let imagesToLoad = [];
								delete opt[folderName];
								let optImg = editor.projectDesc.loadOnDemandTextures;
								let a = Object.keys(optImg);
								for(let f of a) {
									if(f.startsWith(folderName + '/')) {
										imagesToLoad.push(f);
									}
								}
								if(imagesToLoad.length) {
									game.__loadImagesIfUnloaded(imagesToLoad);
									while(imagesToLoad.length) {
										game.__setTextureSettingsBits(imagesToLoad.pop(), 0, 3);
									}
								}
							}
							this.setState({filter: FILTER_ALL});
							this.forceUpdate();
						}
					}, noCopyValue:true, value:editor.projectDesc.__loadOnDemandTexturesFolders[folderName], select: LOADING_TYPES}),

				));
			}
		}

		return R.div(null,
			R.btn(R.icon('reload-assets'), editor.ui.viewport.onReloadAssetsClick, 'Reload game assets', 'big-btn'),
			R.btn(R.icon('cleanup-assets'), this.checkForUnusedImages, 'Auto-clean. Check for images unused in prefabs and scenes. It is still can be used in code or in not standard fields', 'big-btn'),
			R.span(null,
				"Filter by loading mode: ",
				React.createElement(SelectEditor, {onChange:(ev) => {
					this.setState({filter: ev.target.value});
				}, noCopyValue:true, value:this.state.filter, select: FILTER_SELECT})
			),
			R.div({className:'list-view'},
				group.groupArray(list)
			)
		);
	}

	checkForUnusedImages() {

		editor.askSceneToSaveIfNeed().then(() => {

			editor.ui.status.clear();

			let allTextures = new Set(Object.values(Lib.__texturesList).map(i => i.name));
	
			function checkValue(key, value) {
				if(value && (typeof value === 'string')) {
					if(allTextures.has(value)) {
						allTextures.delete(value);
					}
				}
				return value;
			}
	
			function checkDataForImages(data) {
				JSON.stringify(data, checkValue);
			}
	
			checkDataForImages(Lib.prefabs);
			checkDataForImages(Lib.scenes);
	
			for(let imageName of allTextures) {
				let texture = Lib.getTexture(imageName);
				if(texture.__noIncludeInToBuild && (texture !== PIXI.Texture.EMPTY)) {
					continue;
				}
				let fileInfo = editor.fs.filesExt.img.find((fn) => {
					return fn.name.substring(4) === imageName;
				});
				if(fileInfo && fileInfo.lib) {
					continue;
				}
				editor.ui.status.warn('No refs to: ' + imageName, 32043, () => {
					let path = this.getImagePath(imageName);
					let view = R.img({src: path, className:'textures-viewer-image'});
					editor.ui.modal.showEditorQuestion('Are you sure?', R.span({className:'danger'},
						'Are you sure you want to delete image: ', R.b(null, imageName), ' ?',
						R.br(),
						'You cannot undo this action.',
						R.br(),
						view
					),() => {
						Lib._unloadTexture(imageName);
						editor.fs.deleteFile('img/' + imageName);
					}, 'Delete');
					
				});
			}
		});
	}
}

