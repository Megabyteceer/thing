import Window from './window.js';
import L from "thing-editor/js/engine/utils/l.js";
import Group from './group.js';
import SelectEditor from './props-editor/select-editor.js';

let languagesMerged;
let langsIdsList;
let oneLanguageTable;
let idsList;

const tableBodyProps = {className:'langs-editor-table'};
const langsEditorProps = {className:'langs-editor'};
const langsEditorWrapperProps = {className:'langs-editor-wrapper'};

let view;
let switcher;

let libSourceFolders = {};
let langsByLib = {};
let currentLibName = 'project-locales';
let localesSourcesList;
let currentLanguage;

let ignoreEdit;

function showTextTable() {
	return new Promise((resolve) => {
		if(!view) {
			switcher.onToggleClick();
			setTimeout(resolve, 1);
		} else {
			resolve();
		}
	});
}

export default class LanguageView extends React.Component {
	
	static loadTextData() {

		let loadings = editor.fs.filesExt.i18n.map((localesPath) => {
			let langId = localesPath.name.split('/').pop().split('.').shift();
			let folder;

			if(localesPath.lib) {
				folder = '/' + localesPath.lib + '/' + localesPath.name;
				let a = localesPath.name.split('/');
				a.pop();
				libSourceFolders[localesPath.lib] = a.join('/');
			} else {
				folder = '/games/' + editor.currentProjectDir + localesPath.name.replace(/\/..\.json$/,'');
			}
			return L.loadLanguages(langId, folder).then((langData) => {

				let libName = localesPath.lib || 'project-locales';
				
				if(!langsByLib[libName]) {
					langsByLib[libName] = {};
				}
				langsByLib[libName][langId] = langData;
			});
		});

		if(editor.projectDesc.__externalLocalesSource) {
			loadings.push(L.loadLanguages(['en'], editor.projectDesc.__externalLocalesSource).then((langData) => {
				langsByLib[editor.projectDesc.__externalLocalesSource] = {en: langData};
			}));
		}

		return Promise.all(loadings).then(() => {
			refreshCachedData();
			switcher.forceUpdate();
			for(let langId in languagesMerged) {
				let txt = languagesMerged[langId];
				for(let id in txt) {
					if(!txt[id]) {
						editor.ui.status.warn('Untranslated text entry ' + langId + '/' + id, 32017, () => {
							LanguageView.editKey(id, langId);
						}); 
					}
				}
			}
		});
	}

	static editKey(key, langId) {
		if(!ignoreEdit) {
			ignoreEdit = true;
			setTimeout(() => {
				ignoreEdit = false;
			}, 10);
			showTextTable().then(() => {
				if(key) {
					view.createKeyOrEdit(key, langId);
				} else {
					view.onAddNewKeyClick();
				}
			});
		}
	}
	
	constructor(props) {
		super(props);
		this.state = {};
		this.onToggleClick = this.onToggleClick.bind(this);
		switcher = this;
	}
	
	onToggleClick() { //show/hide text editor window
		let t = !this.state.toggled;
		this.setState({toggled: t});
		if(t) {
			Window.bringWindowForward('#window-texteditor', true);
		}
	}
	
	render () {
		let btn = R.btn(this.state.toggled ? 'Close Text Editor (Ctrl+E)' : 'Open Text Editor (Ctrl+E)', this.onToggleClick, undefined, 'menu-btn', 1069);
		let table;
		if(this.state.toggled) {
			table = editor.ui.renderWindow('texteditor', 'Text', 'Text Table', R.fragment(
				R.btn('×', this.onToggleClick, 'Hide Text Editor', 'close-window-btn'),
				React.createElement(LanguageTableEditor)), 200, 100, 710, 300, 900, 800);
		}
		return R.fragment(btn, table);
	}
}

const idFixer = /[^0-9a-z\-]/ig;
function texareaID(lang, id) {
	return (lang + '-' + id).replace(idFixer, '-');
}

function isKeyInvalid(val) {
	if (oneLanguageTable.hasOwnProperty(val)) {
		return "ID already exists";
	}
	if (val.endsWith('.') || val.startsWith('.')) {
		return 'ID can not begin or end with "."';
	}
	if (val.match(/[^a-zA-Z\._\d\/]/gm)) {
		return 'ID can contain letters, digits, "_", "/" and "."';
	}
}

class LanguageTableEditor extends React.Component {
	
	constructor (props) {
		super(props);
		this.onAddNewLanguageClick = this.onAddNewLanguageClick.bind(this);
		this.onAddNewKeyClick = this.onAddNewKeyClick.bind(this);
		this.state = {};
		this.searchInputProps = {
			className: 'language-search-input',
			onChange: this.onSearchChange.bind(this),
			placeholder: 'Search',
			defaultValue: ''
		};
	}

	onSearchChange(ev) {
		this.setState({filter: ev.target.value.toLowerCase()});
	}

	componentDidMount() {
		view = this;
	}

	componentWillUnmount() {
		view = null;
		L.__validateTextData();
	}
	
	onAddNewLanguageClick() {
		editor.ui.modal.showPrompt('Enter new language ID:',
			'ru',
			(val) => { //filter
				return val.toLowerCase();
			},
			(val) => { //accept
				if (currentLanguage.hasOwnProperty(val)) {
					return "Language with ID=" + val + " already exists";
				}
			}
		).then((enteredName) => {
			if (enteredName) {
				let lang = {};
				currentLanguage[enteredName] = lang;
				
				for(let langId of idsList) {
					lang[langId] = '';
				}
				onModified();
				this.forceUpdate();
			}
		});
	}

	onAddNewKeyClick() {

		let defaultKey = editor.projectDesc.__localesNewKeysPrefix;
		for(let o of editor.selection) {
			let props = editor.enumObjectsProperties(o);
			for(let p of props) {
				if(p.isTranslatableKey) {
					let k = o[p.name];
					if(k) {
						if(!L.has(k)) {
							defaultKey = k;
						}
						break;
					}
				}
			}
		}
		if(!defaultKey) {
			if(idsList[0]) {
				let a = idsList[0].split('.');
				a.pop();
				defaultKey = a.join('.');
				if(defaultKey) {
					defaultKey += '.';
				}
			} else if(currentLibName !== 'project-locales') {
				defaultKey = currentLibName.split('/').pop() + '.';
			}
		}

		editor.ui.modal.showPrompt('Enter new translatable KEY:',
			defaultKey,
			(val) => { //filter
				return val;
			},
			isKeyInvalid
		).then((enteredName) => {
			if (enteredName) {
				this.createKeyOrEdit(enteredName);
			}
		});
	}
	
	createKeyOrEdit(key, langId = 'en') {
		showTextTable().then(() => {

			if(!oneLanguageTable.hasOwnProperty(key)) { // find key in another source
				for(let src of  localesSourcesList) {
					if(langsByLib[src][langId].hasOwnProperty(key)) {
						currentLibName = src;
						refreshCachedData();
						this.forceUpdate();
						break;
					}
				}
			}
			
			if(!oneLanguageTable.hasOwnProperty(key)) {
				for(let langId of langsIdsList) {
					currentLanguage[langId][key] = '';
				}
			
				onModified();
				this.forceUpdate();
			
				if(editor.selection.length === 1) {
					if(editor.selection[0] instanceof PIXI.Text) {
						let t = editor.selection[0];
						if(!t.text && !t.translatableText) {
							t.translatableText = key;
						}
					}
				}
			}
			setTimeout(() => {
				let area = document.querySelector('.langs-editor-table #' + texareaID(langId, key));
				area.focus();
				area.scrollIntoView({block: "center", inline: "center"});
				window.shakeDomElement(area);
			}, 10);
		});
	}
	
	render() {
		
		let lines = [];
		
		let header = R.div({className:'langs-editor-tr langs-editor-header'}, R.div({className:'langs-editor-th'}), langsIdsList.map((langId) => {
			return R.div({key:langId, className:'langs-editor-th'}, langId);
		}));
		
		idsList.some((id) => {
			let filter = this.state.filter;
			if(filter) {
				if(id.indexOf(filter) < 0) {
					if(langsIdsList.every(langId => currentLanguage[langId][id].toLowerCase().indexOf(filter) < 0)) {
						return;
					}
				}
			}

			lines.push(R.div({key: id, className:'langs-editor-tr'},
				R.div({className:'langs-editor-th selectable-text',
					title: "Ctrl+click to copy key, Double click to rename, Right click to delete",
					onContextMenu: (ev) => {
						sp(ev);
					},
					onMouseDown: (ev) => {
						let currentKey = ev.target.innerText;
						
						if(ev.buttons === 2) {
							return editor.ui.modal.showEditorQuestion('Translatable key delete', 'Delete key ' + currentKey + '?', () => {
								for(let id in currentLanguage) {
									let l = currentLanguage[id];
									delete l[currentKey];
								}
								onModified();
								this.forceUpdate();
							});
						}
						else if(ev.ctrlKey) {
							window.copyTextByClick(ev);
						}
						sp(ev);
					},
					onDoubleClick: (ev) => {
						let currentKey = ev.target.innerText;

						return editor.ui.modal.showPrompt("Translatable key rename:", currentKey, undefined, (nameToCheck) => {
							if(nameToCheck === currentKey) {
								return 'Please rename key.';
							}
							if(oneLanguageTable.hasOwnProperty(nameToCheck)) {
								return 'Key with that name already exists.';
							}
						}).then((newKey) => {
							if(newKey) {
								for(let id in currentLanguage) {
									let l = currentLanguage[id];
									l[newKey] = l[currentKey];
									delete l[currentKey];
								}
								onModified();
								this.forceUpdate();
							}
						});
					}
				}, id),
				langsIdsList.map((langId) => {
					let text = currentLanguage[langId][id];
					return R.div({key: langId, className:'langs-editor-td'}, R.textarea({defaultValue: text, id:texareaID(langId, id), onChange:(ev) => {
						currentLanguage[langId][id] = ev.target.value;
						onModified();
					}}));
				})
			));
		});

		if(!this.state.filter) {
			lines = Group.groupArray(lines, '.');
		}

		return R.div(langsEditorProps,
			R.btn('+ Add translatable KEY...', this.onAddNewKeyClick, undefined, 'main-btn'),
			R.btn('+ Add language...', this.onAddNewLanguageClick),
			R.input(this.searchInputProps),
			(localesSourcesList.length > 1) ? R.div(null, 'Localization data source: ',
				React.createElement(SelectEditor, {onChange: (ev) => {
					if(ev.target.value !== currentLibName) {
						currentLibName = ev.target.value;
						refreshCachedData();
						this.forceUpdate();
					}

				}, value: currentLibName, select: localesSourcesList.map((s) => {
					return {name: s, value: s};
				})})
			) : undefined,
			R.div(langsEditorWrapperProps, 
				header,
				R.div(tableBodyProps,
					lines
				)
			)
		);
	}
}

function refreshCachedData() {

	languagesMerged = {};

	if(editor.projectDesc.libs) {
		localesSourcesList = editor.projectDesc.libs.filter(libName => langsByLib[libName]);
	} else {
		localesSourcesList = [];
	}

	localesSourcesList.push('project-locales');
	for(let libName of localesSourcesList) {
		let libLang = langsByLib[libName];
		if(libLang) {
			for(let langId in libLang) {
				languagesMerged[langId] = Object.assign(languagesMerged[langId] || {}, libLang[langId]);
			}
		}
	}

	if(editor.projectDesc.__externalLocalesSource) {
		for(let langId in langsByLib[editor.projectDesc.__externalLocalesSource]) {
			languagesMerged[langId] = Object.assign(languagesMerged[langId] || {}, langsByLib[editor.projectDesc.__externalLocalesSource][langId]);
		}
	}

	currentLanguage = langsByLib[currentLibName];

	L.setLanguagesAssets(languagesMerged);

	langsIdsList = Object.keys(currentLanguage);
	langsIdsList.sort((a, b) => {
		return (langIdPriority(a) > langIdPriority(b)) ? 1 : -1;
	});
	oneLanguageTable = currentLanguage[langsIdsList[0]];
	idsList = Object.keys(oneLanguageTable);
	assert(oneLanguageTable, "No localization data loaded.");
	let idsForDropdown = Object.keys(languagesMerged[langsIdsList[0]]);

	let a = [{name:'none', value:''}];
	for(let id of idsForDropdown) {
		a.push({name:id, value:id});
	}

	LanguageView._keysSelectableList = a;
}

window.makeTranslatableSelectEditablePropertyDecriptor = (name, important) => {
	return {
		name: name,
		type: String,
		important: important,
		isTranslatableKey: true,
		select: () => {
			return LanguageView._keysSelectableList;
		}
	};
};


let _outjump;
function onModified() {
	if(_outjump) {
		clearTimeout(_outjump);
	}
	
	_outjump = setTimeout(() => {
		L.fefreshAllTextEverywhere();

		for(let id in langsByLib[currentLibName]) {
			let content = L.__serializeLanguage(langsByLib[currentLibName][id]);

			let fileName;
			if(currentLibName.endsWith('.json')) {
				fileName = currentLibName;
			} else if (currentLibName === 'project-locales'){
				fileName = 'i18n/' + '' + id + '.json';
			} else {
				fileName = libSourceFolders[currentLibName] + '/' + id + '.json';
			}

			editor.fs.saveFile(fileName, content, true, false);
		}
		_outjump = null;
	}, 600);
	refreshCachedData();
}

function langIdPriority(l) {
	return l === 'en' ? ' ' : l;
}