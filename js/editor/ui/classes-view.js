import Group from "./group.js";
import Lib from "thing-editor/js/engine/lib.js";
import game from "thing-editor/js/engine/game.js";
import fs from "../utils/fs.js";
import PropsEditor from "./props-editor/props-editor.js";
import Overlay from "../utils/overlay.js";
import {_searchByRegexpOrText} from "../utils/editor-utils.js";

const bodyProps = {className: 'list-view'};
const classItemSubProps = {className: 'class-list-item-sub'};

class ClassesView extends React.Component {
	
	constructor(props) {
		super(props);
		let filter = editor.settings.getItem('classes-filter', '');
		this.state = {filter};
		this.renderItem = this.renderItem.bind(this);
		this.onAddClick = this.onAddClick.bind(this);
		this.onAddAsChildClick = this.onAddAsChildClick.bind(this);
		this.onWrapSelectedClick = this.onWrapSelectedClick.bind(this);
		this.searchInputProps = {
			className: 'classes-search-input',
			onChange: this.onSearchChange.bind(this),
			placeholder: 'Search',
			defaultValue: filter
		};
	}

	onSearchChange(ev) {
		let filter= ev.target.value.toLowerCase();
		editor.settings.setItem('classes-filter', filter);
		this.setState({filter});
	}
	
	onAddClick() {
		editor.addToScene(ClassesView.loadSafeInstanceByClassName(this.state.selectedItem.c.name));
	}
	
	onAddAsChildClick() {
		if(editor.isCanBeAddedAsChild()) {
			editor.attachToSelected(ClassesView.loadSafeInstanceByClassName(this.state.selectedItem.c.name));
		}
	}
	
	static loadSafeInstanceByClassName(className, isForWrapping) {
		// editor.saveBackup();
		let ret = Lib._loadClassInstanceById(className);
		if(ret.__EDITOR_onCreate) {
			ret.__EDITOR_onCreate(isForWrapping);
		}
		// editor.cleanupBackup();
		return ret;
	}
	
	onWrapSelectedClick() {
		editor.wrapSelected(this.state.selectedItem.c.name);
	}

	onNewComponentClick() {
		editor.ui.modal.showListChoose("Choose template for new Custom Component", [
			{
				title: "Basic Game Object",
				desc: "Creates simple game object. Then you can program this object's logic with javascript. This type of object will contain only basic methods of game object 'init', 'update', 'onRemove', but you can add any method you want manually.",
				path: 'basic-game-object.js',
				isScene: false
			},
			{
				title: "Basic Scene",
				desc: "Creates new type of scenes. Then you can create new scenes with this type.",
				path: 'basic-scene.js',
				isScene: true
			},
			{
				title: "Full Game Object",
				desc: "Contains all the methods of game object. Include 'game methods', and 'editor mode methods'.",
				path: 'full-game-object.js',
				isScene: false
			},
			{
				title: "Full Scene",
				desc: "Creates new type of scenes. Then you can create new scenes with this type.",
				path: 'full-scene.js',
				isScene: true
			}
		].map((tmp) => {
			tmp.pureName = tmp.title;
			tmp.name = R.div({className: 'project-item-select'},
				R.div(null, tmp.title),
				R.div({className: 'template-desc'}, tmp.desc)
			);
			return tmp;
		}), false, true).then((selectedTemplate) => {
			if(selectedTemplate) {
				editor.ui.modal.showPrompt('Enter Component Name',
					selectedTemplate.isScene ? 'MyNewScene' : 'MyNewComponent',
					(val) => { //filter
						return  val.replace(/[^a-zA-Z0-9\/]/gm, '_');
					},
					(val) => { //accept
						if (Lib.__hasClass(val)) {
							return "Component with name '" + val + "' already exists";
						}
					}
				).then((enteredClassName) => {
					if(enteredClassName) {
						PropsEditor.showSelectClass(selectedTemplate.isScene, 'Choose base Component').then((selectedBaseClass) => {
							if(selectedBaseClass) {
								let enteredClassNameParts = enteredClassName.split('/').filter(i => i);
								enteredClassName = enteredClassNameParts.pop();
								if(!enteredClassName) {
									editor.ui.modal.showError('Wrong component name provided.', 30001);
									return;
								} 
								if(enteredClassName.match('/^[\d_]/m')) {
									editor.ui.modal.showError('Class name can not start with digit or "_".', 30002);
									return;
								}
								enteredClassName = enteredClassName.substr(0, 1).toUpperCase() + enteredClassName.substr(1);
								if (Lib.__hasClass(enteredClassName)) {
									editor.ui.modal.showError("Component with name '" + enteredClassName + "' already exists.", 30003);
									return;
								}
								let classFoldername = enteredClassNameParts.join('/');
								if(classFoldername) {
									classFoldername += '/';
								}
								fs.getJSON('/thing-editor/js/editor/templates/' + selectedTemplate.path, false, false, false).then((templateSrc) => {
									
									//add or remove super method call if its exists
									let baseClassInstance = new selectedBaseClass();
									const regex = /(\/\/)(super\.)([a-zA-Z_]+)(\(\);)/gm;
									templateSrc = templateSrc.replace(regex, (substr, m1, m2, m3, m4) => {
										let isSuperClassHasThisMethod = baseClassInstance[m3];
										if(isSuperClassHasThisMethod) {
											return m2 + m3 + m4;
										} else {
											return '';
										}
									});
									let targetFolderName = (selectedTemplate.isScene ?'src/scenes/' : 'src/game-objects/');

									let baseClassPath = editor.ClassesLoader.getClassPath(selectedBaseClass.name);
									let isProjectsCustomComponent = baseClassPath.startsWith(game.resourcesPath.substr(1));
									if(isProjectsCustomComponent) {
										baseClassPath = './' + 
										enteredClassNameParts.map(() => {return '../';}).join('') +
										baseClassPath.substr(game.resourcesPath.length - 1 + targetFolderName.length);
									}
									templateSrc = templateSrc.replace(/NEW_CLASS_NAME/gm, enteredClassName);
									templateSrc = templateSrc.replace(/BASE_CLASS_NAME/gm, selectedBaseClass.name);
									templateSrc = templateSrc.replace(/\/BASE_CLASS_PATH/gm, baseClassPath); //this line is necessary because server side fixes import paths with / automatically
									templateSrc = templateSrc.replace(/BASE_CLASS_PATH/gm, baseClassPath);

									let fileName = enteredClassName.replace(/[A-Z]/gm, (substr, offset) => {
										return ((offset === 0) ? '' : '-') + substr.toLowerCase();
									});
									fileName = targetFolderName + classFoldername + fileName + '.js';
									fs.saveFile(fileName, templateSrc).then(() => {
										editor.fs.editFile(game.resourcesPath + fileName);
										editor.reloadClasses();
									});

								});
								
							}
						});
					}
				});
			}
		});
	}

	onSelect() {
	
	}
	
	renderItem(item) {
		let tip;
		if(item.c.__EDITOR_tip) {
			tip = R.tip('class-' + item.c.name,
				'Component "' + item.c.name + '" description:',
				item.c.__EDITOR_tip
			);
		}
		let key;
		if(item.c.hasOwnProperty('__EDITOR_group')) {
			key = item.c.__EDITOR_group + '/' + item.c.name;
		} else {
			key = 'Custom/' + item.c.name;
		}
		
		return R.listItem(
			R.div({
				onMouseDown:(ev) => {
					if(ev.altKey) {
						setTimeout(ev.ctrlKey ? this.onAddClick : this.onAddAsChildClick, 1);
					} else if(ev.ctrlKey) {
						setTimeout(this.onWrapSelectedClick, 1);
					}
				},
				onDoubleClick:(ev) => {
					if(ev.target.tagName !== 'BUTTON') {
						editor.editClassSource(item.c);
					}
				},
				className: 'class-list-item'
			},
			item.c.___libInfo ? item.c.___libInfo.icon : undefined,
			R.div(classItemSubProps,
				R.classIcon(item.c),
				item.c.name,
				tip
			),
			R.btn('<', (ev) => {
				sp(ev);
				findNextOfThisType(item.c, -1, ev.ctrlKey);
			}, 'Find previous ' + item.c.name, 'tool-btn'),
			R.btn('>', (ev) => {
				sp(ev);
				findNextOfThisType(item.c, 1, ev.ctrlKey);
			}, 'Find next ' + item.c.name, 'tool-btn')
			), item, key, this, 'components.' + item.c.name);
	}
	
	selectedItem() {
		if ((!editor.ClassesLoader.gameObjClasses) || (editor.ClassesLoader.gameObjClasses.indexOf(this.state.selectedItem) < 0)) return null;
		return this.state.selectedItem;
	}

	refresh() {
		if(this.refreshTimeout) {
			return;
		}
		this.refreshTimeout = setTimeout(() => {
			this.forceUpdate();
			this.refreshTimeout = null;
		}, 1);

	}
	
	render() {
		
		let body;
		
		let classes = editor.ClassesLoader.gameObjClasses;
		if (!classes) {
			body = 'Loading...';
		} else {

			body =  classes.filter((c) => {
				return _searchByRegexpOrText(c.c.name.toLowerCase(), this.state.filter.toLowerCase()) || (this.state.selectedItem === c)
			}).map(this.renderItem);

			if(!this.state.filter) {
				body = Group.groupArray(body);
			}

			body.reverse();
		}
		
		let bottomPanelClassName = '';
		if (!this.selectedItem()) {
			bottomPanelClassName += ' disabled';
		}
		
		return R.fragment(
			R.div({className: 'classes-top-panel'},
				R.span({className: bottomPanelClassName},
					R.btn('Add', this.onAddClick, 'Add object to the scene. (Alt + Ctrl + [item click])'),
					R.btn('Child', this.onAddAsChildClick, 'Add object as child of selected object. (Alt + [item click])', undefined,undefined, !editor.isCanBeAddedAsChild()),
					R.btn('Wrap', this.onWrapSelectedClick, 'Wrap each selected element on scene. (Ctrl + [item click])', undefined, undefined, !game.__EDITOR_mode)
				),
				R.btn('New', this.onNewComponentClick, 'Create new custom component.'),
				R.input(this.searchInputProps)
			),
			R.div(bodyProps, body)
		);
		
	}
}

function findNextOfThisType(c, direction, findAll) {
	if(findAll) {
		let a = game.currentContainer.findChildrenByType(c).filter((o) => {
			return !Overlay.getParentWhichHideChildren(o);	
		});
		if(game.currentContainer instanceof c) {
			a.push(game.currentContainer);
		}
		editor.selection.clearSelection();
		for (let w of a) {
			editor.ui.sceneTree.selectInTree(w, true);
		}
	} else {
		editor.ui.sceneTree.findNext((o) => {
			return (o instanceof c) && !Overlay.getParentWhichHideChildren(o);
			
		}, direction);
	}
}

export default ClassesView;