// internationalisation
// usage  L('TEXT_ID');
// usage  L('TEXT_ID', val); //val - will replace '%d' entry in result string. Useful fo localised templates.
// usage  L('TEXT_ID', val, val2); //val - will replace '%d' entry in result string, val2 will replace '%s'. Useful fo localised templates.

/// #if EDITOR
import LanguageView from "thing-editor/js/editor/ui/language-view.js";
/// #endif
import game from "../game.js";


let currentLanguageTable = {};
let languages = {};
let currentLanguageId = (window.navigator && navigator.language) ? navigator.language.split('-')[0] : 'en';

let isLangDataLoaded = false;
let langIdToApplyAfterLoading;
/// #if EDITOR
let warnedIds = {};
/// #endif
function L(id, val1 = undefined, val2 = undefined) { //val1 - replaces '%d' entry; val2 - replaces '%s' entry

	/// #if EDITOR
	if(!currentLanguageTable.hasOwnProperty(id)) {
		let fieldName;
		const tryToFindOwner = () => {
			let owner;
			game.forAllChildrenEverywhere((o) => {
				if(owner) {
					return;
				}
				let props = editor.enumObjectsProperties(o);
				for(let p of props) {
					if(p.isTranslatableKey && o[p.name] === id) {
						fieldName = p.name;
						owner = o;
						return;
					}
				}
			});
			if(owner) {
				let tryToFixKey =  editor.projectDesc.__localesNewKeysPrefix + id.split('.').pop();
				if(L.has(tryToFixKey)) {
					editor.onObjectsPropertyChanged(owner, fieldName, tryToFixKey);
					editor.ui.modal.notify('key changed to: ' + tryToFixKey);
				}
				editor.ui.sceneTree.selectInTree(owner);
				editor.ui.propsEditor.selectField(fieldName);
			} else {
				let txt = R.span(null, 'Do you want to create translatable key ', R.b(null, '"' + id + '"'), '?');
				editor.ui.modal.showEditorQuestion(txt, txt, () => {
					LanguageView.editKey(id);
				}, 'Create');
			}
		};
		if(!warnedIds.hasOwnProperty(id)) {
			warnedIds[id] = true;
			editor.ui.status.warn("Translatable text key '" + id + "' is not exists.", 32031, tryToFindOwner);
			setTimeout(() => {
				warnedIds = {};
			}, 1000);
		}
	}
	/// #endif
	
	if (L.idProcessor) {
		id = L.idProcessor(id, val1);
	}
	
	let ret;
	if(currentLanguageTable.hasOwnProperty(id)) {
		ret = currentLanguageTable[id];
	} else {
		ret = id;
	}
	if(typeof val1 !== 'undefined') {
		ret = ret.replace('%d', val1);
		if(typeof val2 !== 'undefined') {
			ret = ret.replace('%s', val2);
		}
	}
	return ret;
}

L.setLanguagesAssets = (_languages) => {
	isLangDataLoaded = true;
	languages = _languages;
	let defaultLanguage = langIdToApplyAfterLoading || currentLanguageId;
	langIdToApplyAfterLoading = null;
	currentLanguageId = null;
	setCurrentLanguage(defaultLanguage);
	/// #if EDITOR
	if(!game.projectDesc.defaultLanguage || !_languages.hasOwnProperty(game.projectDesc.defaultLanguage)) {
		game.projectDesc.defaultLanguage = Object.keys(_languages)[0];
		editor.saveProjectDesc();
	}
	/// #endif
};

function setCurrentLanguage(languageId) {
	if(!isLangDataLoaded) {
		langIdToApplyAfterLoading = languageId;
		return;
	}
	if (currentLanguageId !== languageId) {
		if (languages.hasOwnProperty(languageId)) {
			currentLanguageId = languageId;
		} else {
			currentLanguageId = game.projectDesc.defaultLanguage;
			if(window.navigator && navigator.languages) {
				for(let l of navigator.languages) {
					l = l.split('-')[0];
					if (languages.hasOwnProperty(l)) {
						currentLanguageId = l;
						break;
					}
				}
			}
		}
		currentLanguageTable = languages[currentLanguageId];
		L.fefreshAllTextEverywhere();
	}
	
}

L.loadLanguages = function(langId, path) {
	assert(path, "Path to i18n data folder expected");

	if(!langId) {
		assert(langIdToApplyAfterLoading, "For not embedded languages you should call L.setCurrentLanguage('en') before game.init");
		langId = langIdToApplyAfterLoading;
	}

	return new Promise((resolve) => {

		let fn = 
		/// #if EDITOR	
		path.endsWith('.json') ? path :
		/// #endif
			path + '/' + langId + '.json';
		return game.fetchResource(fn).then((data) => {
			data = L._deserializeLanguage(data);
			
			/// #if EDITOR	
			/*
			/// #endif
				languages[langId] = data;
				this.setLanguagesAssets(languages);
			//*/
			resolve(data);
		});
	})
	/// #if EDITOR	
		.then((d) => {
			L.__validateTextData();
			return d;
		})
	/// #endif
	;
};

L.has = (id) => {
	return currentLanguageTable.hasOwnProperty(id);
};

L.getArray = (id) => { // 99999
	const result = [];
	let index = 0;
	while (L.has(`${id}.${index}`)) {
		result.push(L(`${id}.${index}`));
		index += 1;
	}
	return result;
};

L.fefreshAllTextEverywhere = function fefreshAllTextEverywhere() {
	if(game.stage) {
		game.forAllChildrenEverywhere(refreshTranslantableText);
	}
};

function refreshTranslantableText(o) {
	if(o.onLanguageChanged) {
		o.onLanguageChanged();
	}
}

L.getCurrentLanguageId = () => {
	return currentLanguageId;
};

L.getLanguagesList = () => {
	return Object.keys(languages);
};

L.setCurrentLanguage = setCurrentLanguage;

L._deserializeLanguage = function(langSrc) {
	let ret = {};
	deserializeEntry(langSrc, ret);
	return ret;
};

function deserializeEntry(src, output, path) {
	for(let key in src) {
		if(src.hasOwnProperty(key)) {
			let val = src[key];
			if((typeof val) === 'string' ) {
				if(path) {
					output[path + key] = src[key];
				} else {
					output[key] = src[key];
				}
			} else {
				if(path) {
					deserializeEntry(val, output, path + key + '.');
				} else {
					deserializeEntry(val, output, key + '.');
				}
			}
		}
	}
}


///#if EDITOR

L.__validateTextData = function () {
	for(let textId in currentLanguageTable) {
		let templatesExample;

		for(let langId in languages) {
			let langData = languages[langId];
			let text = langData[textId];
			if(text) {

				let a = [];
				text.replace(/%\w/gm, (m) => {
					a.push(m);
				});

				a.sort((a,b) => {
					if(a > b) return 1;
					if(a < b) return -1;
					return 0;
				});
				let templates = a.join(',');

				if(typeof templatesExample === 'undefined') {
					templatesExample = templates;
				} else {
					if(templatesExample !== templates) {
						(() => {
							let localLangId = langId;
							let localTextId = textId;
							editor.ui.status.warn('Localization data with id "' + textId + '" has no matched %d %s templates set.', 32052, () => {
								LanguageView.editKey(localTextId, localLangId);
							});
						})();
					}
				}
			}
		}
	}
};

L.__serializeLanguage = (langData) => {
	let ret = {};
	for(let srcId in langData) {
		if(langData.hasOwnProperty(srcId)) {
			let a = srcId.split(/[\.]/gm);
			let r = ret;
			while(a.length > 1) {
				let pathPart = a.shift();
				if(!r.hasOwnProperty(pathPart)) {
					r[pathPart] = {};
				}
				r = r[pathPart];
			}
			r[a[0]] = langData[srcId];
		}
	}
	return ret;
};

L.__getTextAssets = () => {
	return languages;
};

///#endif


export default L;
