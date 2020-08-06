import Container from "./container.js";
import Lib from "../lib.js";
import game from "../game.js";
import getValueByPath from "../utils/get-value-by-path.js";

const zeroPoint = new PIXI.Point();

const PI2 = Math.PI * 2.0;

export default class SpawnerRing extends Container {

	init() {
		super.init();
		this.curInterval = this.interval;
	}

	spawn() {
		/// #if EDITOR
		if(!this.prefabToSpawn) {
			editor.ui.status.error('Prefab to spawn is not selected.', 30015, this, 'prefabToSpawn');
			return;
		} else if(!Lib.hasPrefab(this.prefabToSpawn)) {
			editor.ui.status.error('Prefab with name "' + this.prefabToSpawn + '" is not exists.', 30016, this, 'prefabToSpawn');
			return;
		}
		/// #endif
		if (!this._container) {
			if(this.container) {
				this._container = getValueByPath(this.container, this);
				/// #if EDITOR
				if(!this._container) {
					editor.ui.status.error("Spawner targeted to not existing container: " + this.container, 30017, this, 'container');
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
			editor.ui.status.error("SpawnerRing's target container has been removed. Please disable spawner before removing target container or use not removable target container.", 99999, this, 'container');
			return;
		}
		/// #endif

		this._container.toLocal(zeroPoint, this, spawnPoint);
		let step = PI2 / (this.count + (this.countRandom * Math.random()));
		for(let i = 0; i < PI2; i += step) {
			let sin = Math.sin(i);
			let cos = Math.cos(i);

			let o = Lib.loadPrefab(this.prefabToSpawn);
			this._container.addChild(o);
			o.x = spawnPoint.x + this.radius * cos;
			o.y = spawnPoint.y + this.radius * sin;
			let sp = this.speed + Math.random() * this.speedRandom;
			o.xSpeed = sp * cos;
			o.ySpeed = sp * sin;
		}
	}
}

const spawnPoint = new PIXI.Point();

/// #if EDITOR

SpawnerRing.prototype.spawn.___EDITOR_isGoodForCallbackChooser = true;

SpawnerRing.__EDITOR_group = 'Basic';
SpawnerRing.__EDITOR_icon = 'tree/spawner-ring';
__EDITOR_editableProps(SpawnerRing, [
	{
		type: 'splitter',
		title: 'SpawnerRing:',
		name: 'spawner-ring'
	},
	{
		name: 'prefabToSpawn',
		type: String,
		select:window.makePrefabSelector(undefined, false),
		important:true
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
		name:'count',
		type:Number,
		default: 10
	},
	{
		name:'countRandom',
		type:Number,
		default: 10
	},
	{
		name:'radius',
		type:Number,
		default: 10
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