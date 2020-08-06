import Container from "./container.js";
import Lib from "../lib.js";
import game from "../game.js";
import getValueByPath from "../utils/get-value-by-path.js";

const zeroPoint = new PIXI.Point();

export default class Spawner extends Container {

	init() {
		super.init();
		this.curInterval = Math.round(Math.random() * this.intervalRandom);
	}

	enable() {
		this.enabled = true;
	}

	disable() {
		this.enabled = false;
	}

	setSpeed(speed) { // 99999
		this.speed = speed;
	}

	update() {
		if(this.enabled && this.worldVisible) {
			if(this.delay > 0) {
				this.delay--;
			} else {
				if(this.curInterval > 0) {
					this.curInterval--;
				} else {
					this.spawn();
					this.curInterval = this.getNextInterval();
				}
			}
		}
		super.update();
	}
	
	getNextInterval() {
		if(this.intervalRandom > 0) {
			return this.interval + Math.round(Math.random() * this.intervalRandom);
		}
		return this.interval;
	}

	spawn() {
		/// #if EDITOR
		if(!this.prefabToSpawn) {
			editor.ui.status.error('Prefab to spawn is not selected.', 32005, this, 'prefabToSpawn');
			return;
		} else if(!Lib.hasPrefab(this.prefabToSpawn)) {
			editor.ui.status.error('Prefab with name "' + this.prefabToSpawn + '" is not exists.', 32006, this, 'prefabToSpawn');
			return;
		}
		/// #endif
		if (!this._container) {
			if(this.container) {
				this._container = getValueByPath(this.container, this);
				/// #if EDITOR
				if(!this._container) {
					editor.ui.status.error("Spawner targeted to not existing container: " + this.container, 32007, this, 'container');
					this._container = game.currentContainer;
				}
				/// #endif
			} else {
				this._container = game.currentContainer;
			}
			/// #if EDITOR
			this.___containerID = this._container.___id;
			/// #endif
		}

		/// #if EDITOR
		if(this.___containerID !== this._container.___id) {
			editor.ui.status.error("Spawner's target container has been removed. Please disable spawner before removing target container or use not removable target container.", 99999, this, 'container');
			this.disable();
			return;
		}
		/// #endif

		let o = Lib.loadPrefab(this.prefabToSpawn);
		if(this.applyRotation) {
			o.rotation = this.getGlobalRotation();
		}
		

		this._container.addChild(o);
		o.parent.toLocal(zeroPoint, this, o);

		if(this.speed !== 0 || this.speedRandom !== 0) {
			let sp = this.speed + Math.random() * this.speedRandom;
			spawnPoint.x = sp;
			o.parent.toLocal(spawnPoint, this, spawnPointRet, true);
			o.xSpeed = spawnPointRet.x - o.x;
			o.ySpeed = spawnPointRet.y - o.y;
		}
		
	}
}

const spawnPoint = new PIXI.Point();
const spawnPointRet = new PIXI.Point();

/// #if EDITOR

Spawner.prototype.enable.___EDITOR_isGoodForCallbackChooser = true;
Spawner.prototype.disable.___EDITOR_isGoodForCallbackChooser = true;
Spawner.prototype.spawn.___EDITOR_isGoodForCallbackChooser = true;
Spawner.prototype.setSpeed.___EDITOR_isGoodForCallbackChooser = true;

Spawner.__EDITOR_group = 'Basic';
Spawner.__EDITOR_icon = 'tree/spawner';
__EDITOR_editableProps(Spawner, [
	{
		type: 'splitter',
		title: 'Spawner:',
		name: 'spawner'
	},
	{
		name: 'prefabToSpawn',
		type: String,
		select:window.makePrefabSelector(undefined, false),
		important:true
	},
	{
		name:'enabled',
		type:Boolean,
		default:true
	},
	{
		name:'delay',
		type:Number,
		min:0
	},
	{
		name:'interval',
		type:Number,
		min:0
	},
	{
		name:'intervalRandom',
		type:Number,
		min:0
	},
	{
		name:'speed',
		type:Number,
		default: 10
	},
	{
		name:'speedRandom',
		type:Number,
		default: 10
	},
	{
		name:'applyRotation',
		type:Boolean
	},
	{
		name:'container',
		type: 'data-path',
		isValueValid: (o) => {
			return (o instanceof Container);
		}
	},
	{
		type: 'ref',
		name: '_container'
	}

]);

/// #endif
