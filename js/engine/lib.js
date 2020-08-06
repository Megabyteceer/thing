import Pool from "./utils/pool.js";
import Scene from "./components/scene.js";
import DisplayObject from "./components/display-object.js";
import game from "./game.js";
import getValueByPath from "./utils/get-value-by-path.js";
import ResourceLoader from "./utils/resource-loader.js";

/// #if EDITOR
let _oldDefaults = {};
let _oldClasses = {};
import ClassesLoader from "thing-editor/js/editor/utils/classes-loader.js";

function accessToOldReferenceDetector(obj, prop) {
	if(!Lib.__outdatedReferencesDetectionDisabled) {
		editor.editClassSource(obj.class_);
		assert(prop === 'thisIsOutdatedReference', "Access to outdated reference \"" + obj.fieldName + "\" in class \"" + obj.class_.name + "\" detected. Please clear reference in onRemove method.", 10041);
	}
}
const accessDetectionProxiesCache = new Map();
const accessDetectionProxy = (class_, fieldName) => {
	let key = class_.name + ':' + fieldName;
	if(!accessDetectionProxiesCache.has(key)) {
		let p = new Proxy({
			thisIsOutdatedReference: "thisIsOutdatedReference",
			class_,
			fieldName
		}, {
			get: accessToOldReferenceDetector,
			set: accessToOldReferenceDetector,
			has: accessToOldReferenceDetector,
			deleteProperty: accessToOldReferenceDetector,
			ownKeys: accessToOldReferenceDetector,
			apply: accessToOldReferenceDetector
		});
		accessDetectionProxiesCache.set(key, p);
		return p;
	}
	return accessDetectionProxiesCache.get(key);
};

let deserializationDeepness = 0;

function markOldReferences(o) {
	o.___EDITOR_markedOldReferences = new Map();
	for(let f of Object.getOwnPropertyNames(o)) {
		if((o[f] instanceof DisplayObject)) {
			if(f !== 'tempDisplayObjectParent') {
				o[f] = accessDetectionProxy(o.constructor, f);
				o.___EDITOR_markedOldReferences.set(f, o[f]);
			}
		}
	}
}

function checkForOldReferences(o) {
	if(o.___EDITOR_markedOldReferences && !Lib.__outdatedReferencesDetectionDisabled) {
		for(let f of o.___EDITOR_markedOldReferences.keys()) {
			if(o[f] === o.___EDITOR_markedOldReferences.get(f)) {
				let c = o.constructor;
				let fieldName = f;
				if(ClassesLoader.isItEmbeddedClass(c)) {
					editor.ui.status.error('Property "' + f + '" vas assigned to ' + c.name + ' and not cleared. Please clear reference in onRemove method if you assigned it.', 10049);
				} else {
					editor.ui.status.error(c.name + ' did not clean reference to display object in property "' + f + '". Please null this field in onRemove method, or add "ref" descriptor for this field (click to copy fix-js and open class source code.).', 10048, () => {
						editor.copyToClipboard(`,
	{
	type: 'ref',
	name: '` + fieldName + `'
	}`);
						editor.editClassSource(c);
					});

				}
			}
		}
	}
}


/// #endif

let prefabs = {};
let scenes;
let classes;
let defaults;
let textures = {};
let sounds = {};
let soundsHowlers = {};
let staticScenes = {};


let noCacheCounter = 0;

let constructRecursive = (o) => {
	assert(!game.__EDITOR_mode, "initialization attempt in editing mode.");
	
	if(o._thing_initialized) {
		return;
	}
	o._thing_initialized = true;

	/// #if EDITOR
	let extData = __getNodeExtendData(o);
	assert(!extData.constructorCalled, "init() method was already called for object " + o.___info, 99999);

	editor._root_initCalled = false;
	/// #endif
	
	o.init();
	
	///#if EDITOR
	checkForOldReferences(o);
	if(!editor._root_initCalled) {
		editor.editClassSource(o.constructor);
		assert(false, "Class " + o.constructor.name + " overrides init method without super.init() called.", 10042);
	}

	extData.constructorCalled = true;
	///#endif
	
	let a = o.children;
	let arrayLength = a.length;
	for(let i = 0; i < arrayLength; i++) {
		constructRecursive(a[i]);
	}
};

export default class Lib {
	constructor() {
		assert(false, "Lib can not be instanced.");
	}
	
	static getClass(className) {
		assert(classes.hasOwnProperty(className), "No class with name '" + className + "' registered in Lib", 10043);
		return classes[className];
	}
	
	static _setClasses(c, def) {
		defaults = def;
		classes = c;
		Lib.classes = c;

		/// #if EDITOR
		game.classes = c;
		Object.assign(_oldClasses, c);
		Object.assign(_oldDefaults, def);
		/// #endif
	}
	
	static _setScenes(s) {
		scenes = s;
		Lib.scenes = s;
	}
	
	static _setPrefabs(p) {
		prefabs = p;
		Lib.prefabs = p;


		/// #if EDITOR
		for(let prefabName in p) {
			let pData = p[prefabName];
			if(pData.p.name !== prefabName) {
				pData.p.name = prefabName;
				Lib.__savePrefabData(prefabName);
			}
		}
		/// #endif
	}
	
	static addResource(fileName
		/// #if EDITOR
		, isReloading
		/// #endif
	) {
		if(game._loadingErrorIsDisplayed) {
			return;
		}
		/// #if EDITOR
		if(isReloading && Lib.resources[fileName]) {
			let oldTextures = Lib.resources[fileName].textures;
			if(oldTextures) {
				for(let oldTextureName in oldTextures) {
					Lib._unloadTexture(oldTextureName, true);
				}
			}
		}

		
		if(!isReloading || !Lib.__resourcesList.find(i => i.name === fileName)) {
			Lib.__resourcesList.push({name:fileName, value: fileName});
		}
		/// #endif

		let loader = new ResourceLoader();
		
		loader.add(fileName, game.resourcesPath + fileName);
		
		
		loader.load((loader, resources) => {
			
			let res = resources[fileName];
			Lib.resources[fileName] = res;
			if(res.textures) {
				for(let name in res.textures) {
					/// #if EDITOR
					res.textures[name].__noIncludeInToBuild = true;
					/// #endif
					Lib.addTexture(name, res.textures[name]);
				}
			}
		});
	}

	static addTexture(name, texture
		/// #if EDITOR
		, addToBegin = false, libName
		/// #endif
	) {

		if(name !== 'EMPTY' && name !== 'WHITE') {
			if(Lib.hasTexture(name)) {
				Lib._unloadTexture(name);
			}
		}
		scheduleTextureRefresh(name);
		/// #if EDITOR

		let visibleName;
		if(libName) {
			visibleName = R.span(null, R.libInfo(libName).icon, name);
		} else {
			visibleName = name;
		}

		if(!__allTextures.hasOwnProperty(name)) {
			if(addToBegin) {
				Lib.__texturesList.splice(2, 0, {name, visibleName, value: name});
			} else {
				Lib.__texturesList.push({name, visibleName, value: name});
			}
			__allTextures[name] = true;
		}
		/// #endif
		
		assert(texture || game.projectDesc.loadOnDemandTextures.hasOwnProperty(name), "Invalid texture name: " + name);
		/// #if EDITOR
		if(typeof texture === 'string') {
			if(game.projectDesc.loadOnDemandTextures.hasOwnProperty(name)) {
				return;
			}
			texture += '?noCache=' + Lib.__noCacheCounter;
			
			textures[name] = PIXI.Texture.from(texture);
		} else
		{
		/// #endif
			assert(typeof texture !== 'string', "texture expected but string received.");
			textures[name] = texture;
		/// #if EDITOR
		}
		/// #endif
	}

	static _unloadTexture(name
		/// #if EDITOR
		, ___removeFromEditorList = false
		/// #endif
	) {
		let t = textures[name];
		if(!t) {
			return;
		}
		PIXI.Texture.removeFromCache(t);
		t.destroy(true);
		delete textures[name];
		/// #if EDITOR
		if(___removeFromEditorList) {
			delete __allTextures[name];
			let i = Lib.__texturesList.findIndex(i => i.name === name);
			assert(i >= 0, "cant find texture in  Lib.__texturesList", 90001);
			Lib.__texturesList.splice(i, 1);
		}
		/// #endif
	}

	/// #if EDITOR
	static __deleteSound(soundName) {
		if(soundsHowlers.hasOwnProperty(soundName)) {
			let s = soundsHowlers[soundName];
			s.unload();
			delete soundsHowlers[soundName];
			let i = Lib.__soundsList.find(i => i.name === soundName);
			i = Lib.__soundsList.indexOf(i);
			assert(i >= 0, "Sound was not registered in sounds list: " + soundName);
			Lib.__soundsList.splice(i, 1);
			delete sounds[soundName];
		}
	}
	/// #endif

	/// #if DEBUG
	static __overrideSound(name, src) {
		let opt = {src};
		let s = loadSound(opt);
		s.lastPlayStartFrame = 0;
		soundsHowlers[name] = s;
		if(game.classes.BgMusic) {
			for(let bgm of game.currentContainer.findChildrenByType(game.classes.BgMusic)) {
				if(bgm.isPlaying && (bgm.intro === name || bgm.loop === name)) {
					bgm.stop();
					bgm.resetPosition();
					setTimeout(() => {
						if((bgm.intro === name || bgm.loop === name)) {
							bgm.play();
						}
					}, 3000);
				}
			}
		}
	}

	/// #endif

	static _filterStaticTriggers(childsData) {
		if(childsData.c === 'StaticTrigger') {
			return childsData.p.invert !== !getValueByPath(childsData.p.dataPath || defaults.StaticTrigger.dataPath, game);
		} else {
			return !childsData[':'] || !childsData[':'].some((cd) => {
				return (cd.c === 'StaticTrigger') && (!!cd.p.invert !== !getValueByPath(cd.p.dataPath || defaults.StaticTrigger.dataPath, game));
			});
		}
	}

	static _filterStaticTriggersRecursive(data) {
		if(data[':']) {
			let a = data[':'].filter(Lib._filterStaticTriggers);
			data[':'] = a;
			a.forEach(Lib._filterStaticTriggersRecursive);
		}
	}

	static _setSounds(soundsMap,
		/// #if EDITOR
		updateOnly = false
		/// #endif
	) {
		/// #if EDITOR
		let updateSoundsNames;
		if(updateOnly) {
			updateSoundsNames = soundsMap;
			soundsMap = Object.assign(sounds, soundsMap);
		}
		/// #endif
		sounds = soundsMap;
		for(let sn in soundsHowlers) {
			/// #if EDITOR
			if(updateSoundsNames) {
				if(!updateSoundsNames.hasOwnProperty(sn)) {
					continue;
				}
				/// #endif
				let s = soundsHowlers[sn];
				s.unload();

				/// #if EDITOR
				delete soundsHowlers[sn];
			}
			/// #endif
		}
		/// #if EDITOR
		Lib.__soundsList = [];

		if(!updateSoundsNames)
		/// #endif
			soundsHowlers = {};

		
		for(let name in sounds) {

			let files = sounds[name];
			/// #if EDITOR
			Lib.__soundsList.push({name, value:name, ___libInfo: files.___libInfo});

			if(!updateSoundsNames || updateSoundsNames.hasOwnProperty(name)) {
				/// #endif
				let opt = {
					src: files.map(sndFileNameToPath),
					preload: !game.projectDesc.loadOnDemandSounds.hasOwnProperty(name)
				};
				let s = loadSound(opt);

				s.lastPlayStartFrame = 0;
				soundsHowlers[name] = s;
				/// #if EDITOR
			}
			/// #endif
		}
	}

	static _preCacheSoundsAndTextures() {
		let interval;
		let preloadingStarted = {};

		const preloadOneSound = () => {
			if(game.getLoadingCount() === 0) {
				for(let name in sounds) {
					if(game.projectDesc.loadOnDemandSounds[name] === 2) {
						if(Lib.preloadSound(name)) {
							return;
						}
					}
				}
				for(let imageId in game.projectDesc.loadOnDemandTextures) {
					if(game.projectDesc.loadOnDemandTextures[imageId] === 2) {
						if(!preloadingStarted[imageId]) {
							preloadingStarted[imageId] = true;
							(new Image()).src = game._textureNameToPath(imageId);
							return;
						}
					}
				}
				clearInterval(interval);
			}
		};
		interval = setInterval(preloadOneSound, 1000);
	}

	static getSoundsLoadingCount() {
		let total = 0;
		for(let sn in soundsHowlers) {
			let s = soundsHowlers[sn];
			if(!isSoundLoaded(s)) {
				total++;
			}
		}
		return total;
	}

	static hasSound(soundId) {
		return sounds.hasOwnProperty(soundId);
	}

	static getSound(soundId, __dynamicPreloading) {
		assert(soundsHowlers.hasOwnProperty(soundId), "No sound with id '" + soundId + "' found.");
		let s = soundsHowlers[soundId];
		/// #if EDITOR
		if(!game.__EDITOR_mode) {
			if(s.state() === "unloaded") {
				editor.ui.status.error('Sound "' + soundId + '" is not preloaded. Please check-on preloading mode for this sound, or use Lib.preloadSound("' + soundId + '") in scene\`s onShow() method before using this sound.', 32008);
			} else if(!__dynamicPreloading && (s.state() === "loading")) {
				editor.ui.status.warn('Sound "' + soundId + '" preloading is not finished. Please preload sounds inside onShow method of scene, to automatic insurance of complete sounds preloading.', 32009);
			}
			Lib.preloadSound(soundId);
		}
		/// #endif
		return s;
	}

	static preloadSound(soundId
		/// #if EDITOR
		, owner
		/// #endif
	) {
		if(soundId) {
			/// #if EDITOR
			if(!soundsHowlers.hasOwnProperty(soundId)) {
				editor.ui.status.error("No sound with id '" + soundId + "' found.", 10043, owner);
				return;
			}
			/// #endif
			let s = soundsHowlers[soundId];
			if(s.state() === "unloaded") {
				s.load();
				return true;
			}
		}
	}
	
	static __clearAssetsLists() {
		textures = {};
		Lib.resources = {};
		Lib.__texturesList = [];
		__allTextures = {};
		Lib.__resourcesList = [];
	}
	
	static _loadClassInstanceById(id) {
		let ret = Pool.create(classes[id]);
		Object.assign(ret, defaults[id]
		/// #if EDITOR
		|| _oldDefaults[id]
		/// #endif	
		);
		
		/// #if EDITOR
		if(ret instanceof Scene) {
			ret.all = '"scene.all" is not initialized yet.';
		}

		if(!game.__EDITOR_mode) {
		/// #endif
			
			constructRecursive(ret);
			
		/// #if EDITOR
		}
		Lib.__reassignIds(ret);
		/// #endif
		
		return ret;
	}
	
	static hasTexture(name) {
		return textures.hasOwnProperty(name);
	}
	
	static getTexture(name
	/// #if EDITOR
		, owner
	/// #endif
	) {
		
		/// #if DEBUG
		if(!textures.hasOwnProperty(name)) {

			if(!game.projectDesc.loadOnDemandTextures.hasOwnProperty(name)) {
				/// #if EDITOR
				editor.ui.status.error("No texture with name '" + name + "' registered in Lib", 32010, owner);
				/*
				/// #endif
				if(!Lib.__alertedImages) {
					Lib.__alertedImages = {};
				}
				if(!Lib.__alertedImages[name]) {
					Lib.__alertedImages[name] = true;
					alert("Wrong texture name: " + name);
				}
				//*/
			}
			/// #if EDITOR
			else if(!game.currentFader && !game.__EDITOR_mode) {
				editor.ui.status.error("Texture with name '" + name + "' is not loaded. Need add to scene static invisible sprite with that texture to automatically load it at scene beginning.", 32051, owner);
			}
			return editor.__wrongTexture;
			/// #endif
			return PIXI.Texture.WHITE; // eslint-disable-line no-unreachable
		}
		/// #endif
		
		return textures[name];
	}
	
	static loadPrefab(name) {
		assert(prefabs.hasOwnProperty(name), "No prefab with name '" + name + "' registered in Lib", 10044);
		/// #if EDITOR
		if(name.indexOf(editor.editorFilesPrefix) !== 0) {
			prefabs[name].p.name = name;
		}
		let ret = _loadObjectFromData(prefabs[name]);
		if(!game.__EDITOR_mode) {
			Lib.__reassignIds(ret);
		}
		return ret;
		/// #endif
		return _loadObjectFromData(prefabs[name]); // eslint-disable-line no-unreachable
	}
	
	static destroyObjectAndChildren(o) {
		/// #if EDITOR
		let extData = __getNodeExtendData(o);
		o.__EDITOR_inner_exitPreviewMode();
		if(extData.constructorCalled) {

			editor._root_onRemovedCalled = false;
			/// #endif
			o.onRemove();
			o._thing_initialized = false;
			/// #if EDITOR
			if(!editor._root_onRemovedCalled) {
				editor.editClassSource(o.constructor);
			}
			assert(editor._root_onRemovedCalled, "onRemove method without super.onRemove() detected in class '" + o.constructor.name + "'", 10045);
		}
		if(o.__beforeDestroy) {
			o.__beforeDestroy();
		}
		let needRefreshSelection = extData.isSelected;
		if(extData.isSelected) {
			editor.selection.remove(o);
		}
		/// #endif
		
		o.detachFromParent();
		while(o.children.length > 0) {
			Lib.destroyObjectAndChildren(o.getChildAt(o.children.length - 1));
		}

		Pool.dispose(o);
		o.interactiveChildren = true;

		/// #if EDITOR
		delete o.___id;
		delete o.___pathBreakpoint;
		window.__resetNodeExtendData(o);
		if(needRefreshSelection) {
			editor.refreshTreeViewAndPropertyEditor();
		}
		markOldReferences(o);
		/// #endif
	}
	
	static _deserializeObject(src) {
		let ret;
		/// #if EDITOR
		deserializationDeepness++;
		if(!src.p.hasOwnProperty('___id')) {
			src.p.___id = Lib.__idCounter++;
		}

		if(!classes.hasOwnProperty(src.c)) {
			if(_oldClasses.hasOwnProperty(src.c)) {
				ret = Pool.create(_oldClasses[src.c]);
				editor.ui.status.error("Class " + src.c + " was not loaded. Latest valid version used.", 32011, ret);
			} else {
				let replaceClassName = (Object.values(scenes).indexOf(src) >= 0) ? 'Scene' : 'Container';

				ret = Pool.create(classes[replaceClassName]);
				let oldClassname = src.c;
				src.c = replaceClassName;
				setTimeout(() => { // wait for id assign
					editor.ui.status.error( "Unknown class " + oldClassname + " was replaced with class " + replaceClassName + ".", 32012, ret);
				}, 1);
			}
		}
		assert(defaults.hasOwnProperty(src.c), 'Class ' + src.c + ' has no default values set');
		/// #endif
		
		if( // PrefabReference processing
		/// #if EDITOR
			!game.__EDITOR_mode &&
			/// #endif
			src.c === "PrefabReference"
		) {
			let prefabName;
			if(src.p.hasOwnProperty('dynamicPrefabName')) {
				prefabName = getValueByPath(src.p.dynamicPrefabName, this);
				assert(prefabName, 'dynamicPrefabName "' + src.p.dynamicPrefabName + '" refers to empty value', 10067);
			} else {
				prefabName = src.p.prefabName;
			}

			assert(prefabs.hasOwnProperty(prefabName), 'PrefabReference refer to unknown prefab "' + src.p.prefabName + '"', 32013, ret, 'prefabName');

			ret = Lib._deserializeObject(prefabs[prefabName]);
			if(!src.p.hasOwnProperty('inheritProps')) {
				/// #if EDITOR
				ret.___id = src.p.___id;
				/// #endif
				Object.assign(ret, defaults[src.c]
				/// #if EDITOR
				|| _oldDefaults[src.c]
				/// #endif
				, src.p);
			}
			/// #if EDITOR
			else {
				assert(src.p.inheritProps === false, 'inheritProps property default value changed to false. ref deserialization needs refactoring.');

			}
			/// #endif
		} else {
			ret = Pool.create(classes[src.c]);
			/// #if EDITOR
			ret.___id = src.p.___id;
			if(ret.__beforeDeserialization) {
				ret.__beforeDeserialization();
			}
			/// #endif
			Object.assign(ret, defaults[src.c]
				/// #if EDITOR
				|| _oldDefaults[src.c]
				/// #endif
			, src.p);
		}

		if(src.hasOwnProperty(':')) {
			let childrenData = src[':'];

			/// #if EDITOR
			if(!game.__EDITOR_mode) {
				childrenData = childrenData.filter(Lib._filterStaticTriggers);
			}
			/// #endif
			for(let childData of childrenData) {
				/// #if EDITOR
				if(game.__EDITOR_mode || !childData.p.hasOwnProperty('name') || !childData.p.name.startsWith('___')) {
				/// #endif
					ret.addChild(Lib._deserializeObject(childData));
				/// #if EDITOR
				}
				/// #endif
			}
		}
		
		/// #if EDITOR

		deserializationDeepness--;
		if(deserializationDeepness === 0) {
			processAfterDeserialization(ret);
			ret.forAllChildren(processAfterDeserialization);
		}
		/// #endif

		return ret;
	}
	
	static loadScene(name) {
		if(
		/// #if EDITOR
			!game.__EDITOR_mode &&
			/// #endif
			staticScenes.hasOwnProperty(name)) {
			return staticScenes[name];
		}

		
		/// #if EDITOR
		if(!game.__EDITOR_mode && game.__EDITOR_currentSceneData && (name === game.__EDITOR_currentSceneData.p.__libSceneName)) {
			let scene = Lib._loadObjectFromData(game.__EDITOR_currentSceneData);
			if(scene.isStatic) {
				Lib._getStaticScenes()[scene.__libSceneName] = scene;
			}
			return scene;
		} 
		/// #endif
		
		let isSceneExists = scenes.hasOwnProperty(name);
		assert(isSceneExists, "No scene with name '" + name + "'", 10046);
		if(!isSceneExists) {
			name = Object.keys(scenes)[0]; //get any scene
		}
		
		let data = scenes[name];

		/// #if EDITOR
		let sceneLoadingTimeout = setTimeout(() => {
			editor.ui.modal.showFatalError('Error during scene "' + name + '" loading', 10068);

		}, 0);
		if(!data.p.__libSceneName) {
			/// #endif
			data.p.__libSceneName = name;
			/// #if EDITOR
		}
		/// #endif
		let s = _loadObjectFromData(data);
		delete data.p.__libSceneName;

		if(game.hasOwnProperty('__savedCurrentSceneForInitTime')) {
			game._setCurrentScene(game.__savedCurrentSceneForInitTime);
			delete game.__savedCurrentSceneForInitTime;
		}
		if(s.isStatic
			/// #if EDITOR
			&& !game.__EDITOR_mode
			/// #endif
		) {
			staticScenes[name] = s;
		}
		/// #if EDITOR
		clearTimeout(sceneLoadingTimeout);
		/// #endif
		return s;
	}
	
	static hasPrefab(name) {
		return prefabs.hasOwnProperty(name);
	}

	static hasScene(name) {
		return scenes.hasOwnProperty(name);
	}
	
	static _getStaticScenes() {
		return staticScenes;
	}

	/// #if EDITOR

	static __reassignIds(o) {
		o.___id = Lib.__idCounter++;
		o.children.some(Lib.__reassignIds);
	}

	static __hasTextureEvenUnloaded(name) {
		return __allTextures.hasOwnProperty(name);
	}
	
	static __dataHasClass(data, class_) {
		let c = classes[data.c];
		while(c) {
			if(c === class_) {
				return true;
			}
			c = c.__proto__;
			if(c === DisplayObject) {
				break;
			}
		}

		if(data.hasOwnProperty(':')) {
			let childrenData = data[':'];
			for(let childData of childrenData) {
				return Lib.__dataHasClass(childData, class_);
			}
		}
	}

	static __hasClass(className) {
		return classes.hasOwnProperty(className);
	}
	
	static __saveScene(scene, name) {
		
		assert(game.__EDITOR_mode, "attempt to save scene in running mode: " + name);
		
		assert(typeof name === 'string');
		if(!scene) {
			assert(name === editor.editorFilesPrefix + 'tmp', 'Only temporary scene can be null');
			scenes[name] = undefined;
		} else {
			assert(editor.ClassesLoader.getClassType(scene.constructor) === Scene, "attempt to save not Scene instance in to scenes list.");
			editor.disableFieldsCache = true;
			let sceneData = Lib.__serializeObject(scene);
			editor.disableFieldsCache = false;
			if(name.indexOf(editor.editorFilesPrefix) === 0) {
				sceneData.p.__libSceneName = scene.name;
			} else {
				scene.__libSceneName = name;
			}
			if(scenes[name]) {
				let s = scenes[name];
				if(s.___libInfo) {
					sceneData.___libInfo = s.___libInfo;
				}
			}
			scenes[name] = sceneData;
			return editor.fs.saveFile(Lib.__sceneNameToFileName(name), sceneData, true);
		}
		return Promise.resolve();
	}

	
	static get __noCacheCounter() {
		return noCacheCounter++;
	}

	static __onAllAssetsLoaded(callback) {

		let interval = setInterval(() => {

			if(game.getLoadingCount(true) > 0) {
				return;
			}

			if(Lib.__texturesList.some((t) => {
				if(!textures[t.name]) {
					return !game.projectDesc.loadOnDemandTextures.hasOwnProperty(t.name);
				}
				return !isTextureValid(textures[t.name]);
			})) {
				return;
			}

			callback();
			clearInterval(interval);
		},20);
	}
	
	static __savePrefab(object, name) {
		
		assert(game.__EDITOR_mode, "attempt to save prefab in running mode: " + name);
		assert(typeof name === 'string');
		assert(editor.ClassesLoader.getClassType(object.constructor) === DisplayObject, "attempt to save Scene or not DisplayObject as prefab.");
		let tmpName = object.name;
		if(name.indexOf(editor.editorFilesPrefix) !== 0) {
			object.name = name;
		}
		editor.disableFieldsCache = true;
		let prefabData = Lib.__serializeObject(object);
		editor.disableFieldsCache = false;
		if(prefabs[name]) {
			let p = prefabs[name];
			if(p.___libInfo) {
				prefabData.___libInfo = p.___libInfo;
			}
		}
		prefabs[name] = prefabData;
		Lib.__savePrefabData(name);
		object.name = tmpName;
	}

	static __savePrefabData(prefabName) {
		editor.fs.saveFile(Lib.__prefabNameToFileName(prefabName), prefabs[prefabName], true);
	}
	
	static __getNameByPrefab(prefab) {
		if(prefabs[prefab.p.name] === prefab) {
			return prefab.p.name;
		}
		for(let name in prefabs) {
			if(prefabs[name] === prefab) {
				return name;
			}
		}
		assert(false, "unknown prefab name");
	}
	
	static __deletePrefab(name) {
		assert(prefabs.hasOwnProperty(name), "attempt to delete not existing prefab: " + name);
		delete prefabs[name];
		return editor.fs.deleteFile(Lib.__prefabNameToFileName(name));
	}

	static __deleteScene(name) {
		assert(scenes.hasOwnProperty(name), "attempt to delete not existing scene: " + name);
		delete scenes[name];
		return editor.fs.deleteFile(Lib.__sceneNameToFileName(name));
	}
	
	static __sceneNameToFileName(sceneName) {
		return 'scenes/' + sceneName + '.scene.json';
	}

	static __prefabNameToFileName(sceneName) {
		return 'prefabs/' + sceneName + '.prefab.json';
	}

	static __onProjectOpen() {
		_oldClasses = {};
		_oldDefaults = {};
	}
	
	static _getAllScenes() {
		if(!scenes) return undefined;
		let ret = {};
		let keys = Object.keys(scenes);
		for(let sceneName of keys) {
			if(sceneName.indexOf(editor.editorFilesPrefix) !== 0) {
				ret[sceneName] = scenes[sceneName];
			}
		}
		return ret;
	}
	
	static _getAllPrefabs() {
		return prefabs;
	}
	
	static __clearStaticScenes() {
		for(let sceneName in staticScenes) {
			let s = staticScenes[sceneName];
			let scenesStack = game._getScenesStack();
			if(!s.parent && scenesStack.indexOf(s) < 0 && scenesStack.indexOf(s.name) < 0) {
				Lib.destroyObjectAndChildren(s);
			}
		}
		staticScenes = {};
	}

	static __invalidateSerializationCache(o) {
		let p = o;
		while((p !== game.stage) && p) {
			__getNodeExtendData(p).serializationCache = null;
			p = p.parent;
		}
	}

	static __getSceneOrPrefabLibName(o) {
		if(o instanceof Scene) {
			let fileName = 'scenes/' + o.name + '.scene.json';
			let f = editor.fs.filesExt.scenes.find((f) => {
				return f.name === fileName;
			});
			if(f) {
				return f.lib;
			}
		} else {
			let fileName = 'prefabs/' +o.name + '.prefab.json';
			let f = editor.fs.filesExt.prefabs.find((f) => {
				return f.name === fileName;
			});
			if(f) {
				return f.lib;
			}
		}
	}
	
	static __serializeObject(o) {
		
		o.__EDITOR_inner_exitPreviewMode();
		if(o.__beforeSerialization) {
			o.__beforeSerialization();
		}

		let ret;
		if(!editor.disableFieldsCache) {
			ret = __getNodeExtendData(o).serializationCache;
		}
		if(!ret) {
			let props = {};
			let propsList = editor.enumObjectsProperties(o);

			for(let p of propsList) {
				if(!p.notSerializable) {
					let val = o[p.name];
					if((val != p.default) && (typeof val !== 'undefined') && (val !== null)) {
						if(p.type === 'rect') {
							props[p.name] = {
								x:val.x,
								y:val.y,
								w:val.w,
								h:val.h
							};
						} else {
							props[p.name] = val;
						}
					}
				}
			}

			assert(classes.hasOwnProperty(o.constructor.name) || _oldClasses.hasOwnProperty(o.constructor.name), 'Attempt to serialize class ' + o.constructor.name + ' which was not loaded properly.');

			ret = {
				c: o.constructor.name,
				p: props
			};
			if(o.children.length > 0) {
				let children = o.children.filter(__isSerializableObject).map(Lib.__serializeObject);
				if(children.length > 0) {
					ret[':'] = children;
				}
			}
			__getNodeExtendData(o).serializationCache = ret;
		}
		
		if(o.__afterSerialization) {
			o.__afterSerialization(ret);
		}
		
		return ret;
	}
	/// #endif

}

function loadSound(opt) {
	let s = new Howl(opt);
	s.once('loaderror', (er)=> {
		s.loadedWithError = true;
		assert(false, "Can't load sound file " + opt.src + '. Error: ' + er);
	});
	s.once('load', ()=> {
		assert(opt.src.indexOf(s._src) >= 0, 'Howler _src property moved.');
		if(s._src.endsWith('.mp3')) {
			cutMp3Gaps(s);
		}
	});
	return s;
}

const _loadObjectFromData = (src) => {
	let ret = Lib._deserializeObject(src);
	
	/// #if EDITOR
	if(!game.__EDITOR_mode) {
		/// #endif
		
		constructRecursive(ret);
		
		/// #if EDITOR
	}
	/// #endif
	
	return ret;
};

/**
 * @param {string} sndFile - sound id
 */
function sndFileNameToPath(sndFile) {
	return game.resourcesPath + 'snd/' + sndFile;
}

/**
 * @param {PIXI.Texture} t 
 */
function isTextureValid(t) {
	return t.valid || t.textureCacheIds.length === 0;
}
function isSoundLoaded(s) {
	return s.state() !== "loading" || s.loadedWithError;
}


const texturesRefreshSchedulledNames = new Set();
let texturesRefreshSchedulledTimeout;

function scheduleTextureRefresh(name) {
	if(texturesRefreshSchedulledTimeout) {
		clearTimeout(texturesRefreshSchedulledTimeout);
	}
	texturesRefreshSchedulledTimeout = setTimeout(refreshAllTextures, 10);
	texturesRefreshSchedulledNames.add(name);
}

function refreshAllTextures() {
	let emSave = game.__EDITOR_mode;
	game.__EDITOR_mode = true; //enforce update some type of components (tileGrid, fill);
	texturesRefreshSchedulledTimeout = null;
	game.forAllChildrenEverywhere((o) => {
		if(o.image && texturesRefreshSchedulledNames.has(o.image)) {
			let tmp = o.image;
			o.image = 'EMPTY';
			o.image = tmp;
		}
	});
	texturesRefreshSchedulledNames.clear();
	game.__EDITOR_mode = emSave;

}

function cutMp3Gaps(s) {
	try {
		s.volume(0.01);
		s.play();
		let buffer = s._sounds[0]._node.bufferSource.buffer;
		if(!buffer) {
			console.warn('Howler buffer store moved.');
			assert(buffer, 'Howler buffer store moved.');
		}
		s.stop();

		let len = buffer.length;
		let startPos = len;
		let endPos = 0;
		for(let c = 0; c < buffer.numberOfChannels; c++) {
			let data = buffer.getChannelData(c);
			for(let i = 0; i < len; i++) {
				let s = data[i];
				if(s < -0.01 || s > 0.01) {
					if(startPos > i) {
						startPos = i;
					}
					break;
				}
			}
			for(let i = len - 1; i >= 0; i--) {
				let s = data[i];
				if(s < -0.01 || s > 0.01) {
					if(endPos < i) {
						endPos = i;
					}
					break;
				}
			}
		}
		const ratePerMs = buffer.sampleRate / 1000;
		let start = startPos / ratePerMs;
		let duration = endPos / ratePerMs - start;

		let a = s._sprite.__default;
		assert(a.length === 2, "Howler default sprite structure moved.");
		a[0] = start;
		a[1] = duration;
	} catch (er) {
		console.error(er);
	}
}

Lib.resources = {};

/// #if DEBUG
const processAfterDeserialization = (o) => {
	if(o.__afterDeserialization) {
		o.__afterDeserialization();
	}
};

Lib.__getSoundsData = () => {
	return sounds;
};
/// #endif

/// #if EDITOR
Lib._constructRecursive = constructRecursive;

Lib.__idCounter = 1;

Lib.__texturesList = [];
let __allTextures = {};
Lib.__soundsList = [];
Lib._loadObjectFromData = _loadObjectFromData;

const __isSerializableObject = (o) => {
	let exData = __getNodeExtendData(o);
	return !exData.hidden && !exData.noSerialize; /// 99999 noSerialize
};

/// #endif
