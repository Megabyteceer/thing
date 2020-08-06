import PropsFieldWrapper from '../ui/props-editor/props-field-wrapper.js';
import SceneLinkedPromise from 'thing-editor/js/engine/components/scene-linked-promise.js';
import Delay from 'thing-editor/js/engine/components/delay.js';
import Pool from "thing-editor/js/engine/utils/pool.js";
import Container from "thing-editor/js/engine/components/container.js";
import Button from "thing-editor/js/engine/components/button.js";
import Text from "thing-editor/js/engine/components/text.js";
import Label from "thing-editor/js/engine/components/label.js";
import ProgressBar from "thing-editor/js/engine/components/progress-bar.js";
import PrefabReference from "thing-editor/js/engine/components/prefab-reference.js";
import Scissors from "thing-editor/js/engine/components/scissors.js";
import NumberInput from "thing-editor/js/engine/components/number-input.js";
import Trigger from "thing-editor/js/engine/components/trigger.js";
import Resizer from "thing-editor/js/engine/components/resizer.js";
import OrientationTrigger from "thing-editor/js/engine/components/orientation-trigger.js";
import MovieClip from "thing-editor/js/engine/components/movie-clip/movie-clip.js";
import NineSlicePlane from "thing-editor/js/engine/components/nine-slice-plane.js";
import DSprite from "thing-editor/js/engine/components/d-sprite.js";
import Scene from "thing-editor/js/engine/components/scene.js";
import Lib from "thing-editor/js/engine/lib.js";
import FlyText from "thing-editor/js/engine/components/fly-text.js";
import Sprite from "thing-editor/js/engine/components/sprite.js";
import DisplayObject from "thing-editor/js/engine/components/display-object.js";
import Tilemap from "thing-editor/js/engine/components/tilemap.js";
import Shape from "thing-editor/js/engine/components/shape.js";
import Mask from "thing-editor/js/engine/components/mask.js";
import Fill from "thing-editor/js/engine/components/fill.js";
import Spawner from "thing-editor/js/engine/components/spawner.js";
import SpawnerRing from "thing-editor/js/engine/components/spawner-ring.js";
import ClickOutsideTrigger from "thing-editor/js/engine/components/click-outside-trigger.js";
import ScrollLayer from "thing-editor/js/engine/components/scroll-layer.js";
import game from "thing-editor/js/engine/game.js";
import SelectionHighlighter from 'thing-editor/js/engine/components/selection-highlighter.js';
import BgMusic from 'thing-editor/js/engine/components/bg-music.js';
import Spine from 'thing-editor/js/engine/components/spine.js';
import MobileJoystick from 'thing-editor/js/engine/components/mobile-joystick.js';
import HTMLOverlay from 'thing-editor/js/engine/components/html-overlay.js';
import TextInput from 'thing-editor/js/engine/components/text-input.js';
import ParticleContainer from 'thing-editor/js/engine/components/particle-container.js';
import MultilineText from 'thing-editor/js/engine/components/multiline-text.js';
import StaticTrigger from 'thing-editor/js/engine/components/static-trigger.js';
import BitmapText from 'thing-editor/js/engine/components/bitmap-text.js';

let attachedScript;

let ClassesLoader = {};
ClassesLoader.initClassesLoader = function initClassesLoader() {
	//embedded engine classes
	embeddedClasses = [
		[Container, "/thing-editor/js/engine/components/container.js"],
		[Sprite, '/thing-editor/js/engine/components/sprite.js'],
		[DSprite, "/thing-editor/js/engine/components/d-sprite.js"],
		[MovieClip, "/thing-editor/js/engine/components/movie-clip/movie-clip.js"],
		[Scene, "/thing-editor/js/engine/components/scene.js"],
		[Text, "/thing-editor/js/engine/components/text.js"],
		[FlyText, "/thing-editor/js/engine/components/fly-text.js"],
		[Tilemap, "/thing-editor/js/engine/components/tilemap.js"],
		[Button, "/thing-editor/js/engine/components/button.js"],
		[Label, "/thing-editor/js/engine/components/label.js"],
		[ProgressBar, "/thing-editor/js/engine/components/progress-bar.js"],
		[NumberInput, "/thing-editor/js/engine/components/number-input.js"],
		[Trigger,"/thing-editor/js/engine/components/trigger.js" ],
		[Resizer,"/thing-editor/js/engine/components/resizer.js" ],
		[OrientationTrigger,"/thing-editor/js/engine/components/orientation-trigger.js" ],
		[ClickOutsideTrigger,"/thing-editor/js/engine/components/click-outside-trigger.js" ],
		[ScrollLayer,"/thing-editor/js/engine/components/scroll-layer.js" ],
		[SelectionHighlighter,"/thing-editor/js/engine/components/selection-highlighter.js" ],
		[NineSlicePlane, "/thing-editor/js/engine/components/nine-slice-plane.js"],
		[PrefabReference, "/thing-editor/js/engine/components/prefab-reference.js"],
		[Scissors, "/thing-editor/js/engine/components/scissors.js"],
		[Shape, "/thing-editor/js/engine/components/shape.js"],
		[Mask, "/thing-editor/js/engine/components/mask.js"],
		[Fill, "/thing-editor/js/engine/components/fill.js"],
		[Spawner, "/thing-editor/js/engine/components/spawner.js"],
		[SpawnerRing, "/thing-editor/js/engine/components/spawner-ring.js"],
		[BgMusic, "/thing-editor/js/engine/components/bg-music.js"],
		[Spine, "/thing-editor/js/engine/components/spine.js"],
		[MobileJoystick, "/thing-editor/js/engine/components/mobile-joystick.js"],
		[HTMLOverlay, "/thing-editor/js/engine/components/html-overlay.js"],
		[TextInput, "/thing-editor/js/engine/components/text-input.js"],
		[ParticleContainer, "/thing-editor/js/engine/components/particle-container.js"],
		[MultilineText, "/thing-editor/js/engine/components/multiline-text.js"],
		[StaticTrigger, "/thing-editor/js/engine/components/static-trigger.js"],
		[BitmapText, "/thing-editor/js/engine/components/bitmap-text.js"]
	];
};

let classesById = {},
	classesDefaultsById = {}, //default values for serializable properties of class
	classPathById = {
		'SceneLinkedPromise': 'thing-editor/js/engine/components/scene-linked-promise.js',
		'Delay': 'thing-editor/js/engine/components/delay.js'
	};

let cacheCounter = 0;
const embeddedClassesMap = new Map();
let embeddedClasses;

let classesLoadedSuccessfullyAtLeastOnce = false;

let errorOccurred;

let currentLoadingPromiseResolver;
function showError(message, errorCode) {
	errorOccurred = true;
	
	let r = currentLoadingPromiseResolver;
	currentLoadingPromiseResolver = null;
	editor.ui.modal.showError(R.div(null,
		message,
		R.btn('I have fixed code, try again', () => {
			editor.ui.modal.hideModal();
			
			ClassesLoader.reloadClasses().then(() => {
				if(r) {
					r();
				}
			});
		}, 'check DeveloperTools (F12) for additional error description', 'main-btn')),
	errorCode,
	'Game source-code loading error.', !classesLoadedSuccessfullyAtLeastOnce);
}

function getClassType(c) {
	assert(typeof c === 'function', 'Class expected');
	while (c) {
		if (c === Scene) return Scene;
		if (c === DisplayObject) return DisplayObject;
		c = c.__proto__;
	}
}

function addClass(c, path) {
	
	let classType = getClassType(c);
	if (!classType) return;
	
	let name = c.name;
	
	
	if (classPathById.hasOwnProperty(name)) {
		let anotherPath = classPathById[name];
		if (anotherPath !== path) {
			if((editor.fs.files['src/game-objects'].indexOf(anotherPath) >= 0) || (editor.fs.files['src/scenes'].indexOf(anotherPath) >= 0)) {
				showError(R.div(null, 'class ', R.b(null, name), '" (' + path + ') overrides existing class ', R.b(null, (classPathById[name] || 'System class ' + name)), '. Please change your class name.'), 30008);
				return;
			}
		}
	}
	
	classPathById[name] = (((typeof path) === 'string') ? path : false);
	classesById[name] = c;
	
	let item = {c};
	if (classType === DisplayObject) {
		ClassesLoader.gameObjClasses.push(item);
	} else {
		ClassesLoader.sceneClasses.push(item);
	}
	enumClassProperties(c);
}

function enumClassProperties(c) {
	let cc = c;
	let props = [];
	let defaults = {};
	let i = 50;
	
	let path;
	if(!loadedPath) {
		path = embeddedClasses.find((a) => {
			return a[0].name === c.name;
		});
		if(path) {
			path = path[1];
		}
	} else {
		path = loadedPath;
	}

	while (cc && (i-- > 0)) {
		if (!cc.prototype) {
			throw 'attempt to enum editable properties of not DisplayObject instance';
		}
		if (cc.hasOwnProperty('__EDITOR_editableProps')) {
			cc.__EDITOR_editableProps.some((p) => {
				assert(p.name, 'Class ' + c.name + ' has property with no name defined', 40001);
				assert(p.type, 'Class ' + c.name + ' has property "' + p.name + '" with no type defined.', 40002);
				let ownerClassName = c.name + ' (' + path + ')';
				p.owner = ownerClassName;
				
				props = props.filter((pp) => {
					if(pp.name === p.name) {
						if(!pp.override) {
							editor.ui.modal.showError('Redefinition of property "' + p.name + '" at class ' + ownerClassName + '. Already defined at: ' + pp.owner, 40004);
							editor.editClassSource(cc);
						} else {
							p = Object.assign({}, p, pp);
						}
						return false;
					} else {
						return true;
					}
				});

				if (p.type === 'splitter' || p.type === 'btn') {
					p.notSerializable = true;
				} else {
					if (!p.hasOwnProperty('default')) {
						p.default = PropsFieldWrapper.getTypeDescription(p).default;
					}
					if(p.type === 'ref') {
						p.notSerializable = true;
						defaults[p.name] = p.default;
					}
					if(!p.notSerializable) {
						defaults[p.name] = p.default;
					}
					if(c === cc) { //own properties of this class
						if(!p.hasOwnProperty('noNullCheck') && (p.type === Number || p.type === 'color' || p.type === 'select')) {
							window.wrapPropertyWithNumberChecker(c, p.name);
						}
					}
				}
				props.unshift(p);
			});
		}
		if (cc === DisplayObject) {
			break;
		}
		cc = cc.__proto__;
	}
	c.__EDITOR_propsListCache = props;
	delete defaults.___id;
	classesDefaultsById[c.name] = defaults;
}

function clearClasses() {
	classesById = {};
	ClassesLoader.gameObjClasses = [];
	ClassesLoader.sceneClasses = [];
}

//load custom game classes
let head = document.getElementsByTagName('head')[0];

function reloadClasses() { //enums all js files in src folder, detect which of them exports DisplayObject descendants and add them in to Lib.
	assert(game.__EDITOR_mode, "Attempt to reload modules in running mode.");
	loadedPath = null;
	return new Promise((resolve) => {
		cacheCounter++;
		currentLoadingPromiseResolver = resolve;
		setTimeout(() => {
			errorOccurred = false;

			clearClasses();

			enumClassProperties(DisplayObject);
			enumClassProperties(Delay);
			enumClassProperties(SceneLinkedPromise);
			embeddedClasses.some((a) => {
				let c = a[0];
				if(!c.___EDITOR_isGoodForCallbackChooser && !c.___EDITOR_isGoodForChooser) {
					c.___EDITOR_isHiddenForChooser = true;
				}
				embeddedClassesMap.set(c, true);
				addClass(c, a[1]);
			});
		
			window.onerror = function loadingErrorHandler(message, source, lineno, colno) {

				let fn = loadedPath || source.split('?').shift().split(':' + location.port).pop();
				editor.fs.editFile(fn, lineno, colno);
				showError(R.fragment(
					'Attempt to load: ' + loadedPath + ': ' + message,
					R.div({className: 'error-body'}, fn + ' (' + lineno + ':' + colno + ')', R.br(), message),
					'Please fix error in source code and press button to try again:'
				), 30009);
				loadedPath = null;
			};
		
			let scriptSource = '';
			let classesList = editor.fs.filesExt['src/game-objects'].concat(editor.fs.filesExt['src/scenes']);
			classesList.forEach((classInfo, i) => {
				let classPath = classInfo.name;
				if(classPath.endsWith('.js')) {
					let wrongSymbolPos = classPath.search(/[^a-zA-Z_\-\.\d\/]/gm);
					if(wrongSymbolPos >= 0) {
						editor.ui.status.warn("File " + classPath + " ignored because of wrong symbol '" + classPath[wrongSymbolPos] + "' in it's name", 32044, () => {
							editor.fs.editFile(classPath);
						});
					} else {
						scriptSource += ("import C" + i + " from '" + location.origin + '/' + classPath + "?v=" + (cacheCounter) + "'; editor.ClassesLoader.classLoaded(C" + i + ", '" + classPath + "', '" + (classInfo.lib || '') + "');");
					}
				}
			});
		
			let src = 'data:application/javascript,' + encodeURIComponent(scriptSource);
		
			let script = document.createElement('script');
			editor.ui.modal.showSpinner();
			script.onerror = function() {
				showError("Can not load custom component; Please check Browser's console for error details, and fix problem to continue.", 31001);
				script.onload();
			};
			script.onload = function() {
			
				editor.ui.modal.hideSpinner();
				head.removeChild(script);
			
				window.onerror = null;
				if(!errorOccurred) {
					Lib._setClasses(classesById, classesDefaultsById);
				
					classesLoadedSuccessfullyAtLeastOnce = true;
				
					resolve();
				
					editor.ui.classesList.forceUpdate();
					game.__destroyCurrentScene();
					Pool.clearAll();
				} else {
					console.warn('custom components were not loaded because of error.');
				}
			};
			if(attachedScript) {
				attachedScript.remove();
			}
			attachedScript = script;
			script.type = 'module';
			script.src = src;
			head.appendChild(script);

		},10);
	});
}
let loadedPath;
function classLoaded(c, path, libName) {
	loadedPath = path;
	if(!c.hasOwnProperty('__EDITOR_icon')) {
		c.__EDITOR_icon = "tree/game";
	}
	if(libName) {
		c.___libInfo = R.libInfo(libName);
	}
	
	addClass(c, path);
	loadedPath = null;
}

function validateClasses() {
	let classOnValidation;
	let propertyName;
	let validationTimeout = setTimeout(() => {
		editor.editClassSource(classOnValidation);
		if(propertyName) {
			editor.ui.modal.showFatalError('Class validation error. ' + classOnValidation.name + ' throws error if filed ' + propertyName + ' assigned first.', 10050);
		} else {
			editor.ui.modal.showFatalError('Class validation error. ' + classOnValidation.name + ' throws error in constructor.', 10051);
		}
	}, 0);
	for(let name in Lib.classes) {
		classOnValidation = classesById[name];
		let p = classesDefaultsById[name];
		for(let propName in p) {
			propertyName = null;
			let o = new classOnValidation();
			propertyName = propName;
			o[propName] = p[propName];
			Object.assign(o, p);
		}
	}
	clearTimeout(validationTimeout);
}

ClassesLoader.isItEmbeddedClass = (c) => {
	return embeddedClassesMap.has(c);
};

ClassesLoader.validateClasses = validateClasses;
ClassesLoader.reloadClasses = reloadClasses;
ClassesLoader.classLoaded = classLoaded;
ClassesLoader.getClassType = getClassType;
ClassesLoader.classesDefaultsById = classesDefaultsById;
ClassesLoader.getClassPath = (name) => {
	return classPathById[name];
};

export default ClassesLoader;
