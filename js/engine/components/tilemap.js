import Pool from "../utils/pool.js";
import Container from "./container.js";
import Sprite from "./sprite.js";
import game from "../game.js";
import Lib from "../lib.js";

const tmpPoint = new PIXI.Point();

export default class Tilemap extends Container {
	
	constructor() {
		super();
		this.tiles = new Map();
		this.autoUpdate = false;
	}

	init() {
		super.init();
		/// #if EDITOR
		return;
		/// #endif
		this.renewAllMap(); /*eslint-disable-line no-unreachable */
	}
	
	set tilemap(v) {
		this._tileMapData = v;
	}

	get tilemap() {
		///#if EDITOR
		if(this._tileMapData) return this._tileMapData;
		return this.map && this.map.slice(0, this.columns * this.rows);
		///#endif
		return this.map; /*eslint-disable-line no-unreachable */
	}
	
	set texture(t) {
		if(this._texture !== t) {
			this._texture = t;
			for(let c of this.children) {
				if(c instanceof Tile8x8) {
					c.texture = t;
				}
			}
			/// #if EDITOR
			this.refreshTilemapDelayed();
			/// #endif
		}
	}

	get texture() {
		return this._texture;
	}
	
	getTile(X, Y) {
		return this.map[X + Y * this.columns];
	}
	
	setTile(X, Y, i) {
		/// #if EDITOR
		if(i < 0) {
			i = -1;
		} else if(i > this.__maxTileIndex){
			editor.ui.status.warn("Attempt to set imageId: " + i + " for tile (" + X +',' + Y + "). But texture contain only 0.." + this.__maxTileIndex, 32029, this);
			return;
		}

		///#endif

		let pos = X + Y * this.columns;
		if(this.map[pos] !== i /*eslint-disable-line no-constant-condition */
		/// #if EDITOR
			|| true
		///#endif
		
		) {
			this.map[pos] = i;
			this.getTile8x8(X, Y).setTile(X % 8, Y % 8, i);
		}
	}
	
	getTile8x8(X, Y) {
		X = X >> 3;
		Y = Y >> 3;
		
		let key = Y + X * 32;
		
		if (!this.tiles.has(key)) {
			let r = Pool.create(Tile8x8);
			r.clearMap();
			r.x = (X * 8 + 4) * this.tileW - this.wField;
			r.y = (Y * 8 + 4) * this.tileH - this.hField;
			this.tiles.set(key, r);
			this.addChild(r);
			r.setProps();
			return r;
		}
		return this.tiles.get(key);
	}

	updateView() {

		this.getScenePosition(tmpPoint);

		let halfScreenW = game.W / 2;
		let halfScreenH = game.H / 2;

		let X = tmpPoint.x - halfScreenW;
		let Y = tmpPoint.y - halfScreenH;

		let visibleAreaW = halfScreenW + 4 * this.tileW;
		let visibleAreaH = halfScreenH + 4 * this.tileH;

		let tx,ty;

		for(let t8x8 of this.children) {
			tx = X + t8x8.x;
			ty = Y + t8x8.y;
			t8x8.visible = tx < visibleAreaW &&
				tx > -visibleAreaW && 
				ty < visibleAreaH && 
				ty > -visibleAreaH; 

			/// #if EDITOR
			t8x8.visible = true;
			/// #endif

			if(t8x8.visible) {
				t8x8.updateView();
			}
		}
	}

	dispose8x8Tiles() {
		this.tiles.forEach(clear8x8tile);
		this.tiles = new Map();
	}
	
	onRemove() {
		super.onRemove();
		this.dispose8x8Tiles();
		this.map = null;
	}

	clear()	{
		for (let y = 0; y < this.rows; y++ ) {
			for (let x = 0; x < this.columns; x++) {
				this.setTile(x, y, -1);
			}
		}
	}

	resizeMapIfNeed() {
		let size = this.columns * this.rows;

		if (!this.map || (size !== this.map.length)) {
			
			/// #if EDITOR
			let oldMap = this.map;
			/// #endif
			this.map = [];
			for (let i = 0; i < size; i++) {
				this.map.push(-1);
			}
			/// #if EDITOR
			if (oldMap) {
				for(let t8x8 of this.children) {
					t8x8.clearMap();
				}

				let W = Math.min(this.columns, this.__appliedColumns);
				let H = Math.min(this.rows, this.__appliedRows);

				for (let j = H - 1; j >= 0; j--) {
					for (let i = W - 1; i >= 0; i--) {
						this.setTile(i,j, oldMap[i+ j * this.__appliedColumns]);
					}
				}
			}
			
			this.__appliedColumns = this.columns;
			this.__appliedRows = this.rows;
			/// #endif
		}
	}

	render(renderer) {
		/// #if EDITOR
		if(this._needRenewAll) {
			this.renewAllMap();
		}
		/// #endif
		this.updateView();
		super.render(renderer);
	}

	_renderCanvas(renderer) {
		/// #if EDITOR
		if(this._needRenewAll) {
			this.renewAllMap();
		}
		/// #endif
		this.updateView();
		super._renderCanvas(renderer);
	}

	createTypedMap() {
		const imageToType = (Tilemap.tileMapProcessor && Tilemap.tileMapProcessor.imageToType) || (i => i);
		let data = this._tileMapData || this.map;
		return data.map(imageToType);
	}
	
	renewAllMap() {
		if(!Lib.hasTexture(this.image)) {
			return;
		}

		let tw = this.texture.width;
		let th = this.texture.height;
		assert(tw > 0 && th > 0, "Wrong texture for tilemap");

		this.srcTileW = (this.tileW + this.wField * 2);
		this.srcTileH = (this.tileH + this.hField * 2);
		this.tilesOnTextureW = Math.floor(tw / this.srcTileW);
		this.tilesOnTextureH = Math.floor(th / this.srcTileH);
		this.uvTileW = this.srcTileW / tw;
		this.uvTileH = this.srcTileH / th;
		/// #if EDITOR
		this.dispose8x8Tiles();
		/// #endif
		this.resizeMapIfNeed();
		this.__maxTileIndex = this.tilesOnTextureH * this.tilesOnTextureW - 1;
		
		if(this._tileMapData) {
			let pos = this.columns * this.rows - 1;
			let d = this._tileMapData;
			for(let y = this.rows - 1; y >= 0; y--) {
				for(let x = this.columns - 1; x >= 0; x--) {
					this.setTile(x, y, d[pos--]);
				}
			}
			this._tileMapData = null;
		}
		/// #if EDITOR		
		else {
			let pos = this.columns * this.rows - 1;
			for (let y = this.rows - 1; y >= 0; y--) {
				for (let x = this.columns - 1; x >= 0; x--) {
					this.setTile(x, y, this.map[pos--]);
				}
			}
		}

		this._needRenewAll = false;
		///#endif
	}
	
	/// #if EDITOR
	__afterDeserialization() {
		this.map = null;
		this.tiles = new Map();
		this.renewAllMap();
	}

	set rows(v) {
		this.__rows = v;
		this.refreshTilemapDelayed();
	}
	
	get rows() {
		return this.__rows;
	}
	
	set columns(v) {
		this.__columns = v;
		this.refreshTilemapDelayed();
	}

	get columns() {
		return this.__columns;
	}

	set tileW(v) {
		this.__tileW = v;
		this.refreshTilemapDelayed();
	}

	get tileW() {
		return this.__tileW;
	}

	set tileH(v) {
		this.__tileH = v;
		this.refreshTilemapDelayed();
	}

	get tileH() {
		return this.__tileH;
	}

	set wField(v) {
		this.__wField = v;
		this.refreshTilemapDelayed();
	}

	get wField() {
		return this.__wField;
	}

	set hField(v) {
		this.__hField = v;
		this.refreshTilemapDelayed();
	}

	get hField() {
		return this.__hField;
	}

	refreshTilemapDelayed() {
		this._needRenewAll = true;
	}

	addChild(o) {
		assert(o instanceof Tile8x8, "Tilemap can not has children. For on map objects please create additional container.", 10023);
		super.addChild(o);
	}
	/// #endif
}

Object.defineProperty(Tilemap.prototype, 'image', Sprite.imagePropertyDescriptor);

const clear8x8tile = (t) => {
	t.remove();
};


class Tile8x8 extends PIXI.SimpleMesh {

	constructor() {
		super();
		this.drawMode = PIXI.DRAW_MODES.TRIANGLES;
		this.map = [];
	}

	setProps() {
		/// #if EDITOR
		__getNodeExtendData(this).hidden = true;
		this.__lockSelection = true;
		/// #endif

		this.texture = this.parent.texture;
		this.pivot.x = 4 * this.parent.tileW;
		this.pivot.y = 4 * this.parent.tileH;
		this.tileW = this.parent.tileW;
		this.tileH = this.parent.tileH;
		this.pureTileW = this.tileW;
		this.srcTileW = this.parent.srcTileW;
		this.srcTileH = this.parent.srcTileH;
		this.uvTileW = this.parent.uvTileW;
		this.uvTileH = this.parent.uvTileH;
		this.tilesOnTextureW = this.parent.tilesOnTextureW;
	}
	
	setTile(X, Y, i) {
		this.needRefresh = true;
		this.map[X + (Y << 3)] = i;
	}
	
	clearMap() {
		for (let i = 0; i < 64; i++) {
			this.map[i] = -1;
		}
		this.needRefresh = true;
	}

	updateView() {
		if(this.needRefresh) {
			///#if EDITOR
			this.setProps();
			///#endif
			this.refreshTiles();
			this.needRefresh = false;
		}
	}

	refreshTiles() {
		const vertices = [];
		const uvs = [];
		const indices = [];

		let w = this.tileW;
		let h = this.tileH;
		let sW = this.srcTileW;
		let sH = this.srcTileH;
		
		let uvW = this.uvTileW;
		let uvH = this.uvTileH;
		
		let pos = 0;
		let vert = 0;
		let i;
		for(let y=0; y<8; y++) {
			for(let x=0; x<8; x++) {
				i = this.map[pos++];
				if(i >= 0) {

					let px = x*w;
					let py = y*h;
					vertices.push(px, py);
					px += sW;
					vertices.push(px, py);
					py += sH;
					vertices.push(px, py);
					px -= sW;
					vertices.push(px, py);

					px = (i % this.tilesOnTextureW)* uvW;
					py = Math.floor(i/this.tilesOnTextureW) * uvH;
					uvs.push(px, py);
					px += uvW;
					uvs.push(px, py);
					py += uvH;
					uvs.push(px, py);
					px -= uvW;
					uvs.push(px, py);

					indices.push(vert, vert+1, vert+2);
					indices.push(vert, vert+2, vert+3);
					vert += 4;
				}
			}
		}

		this.verticesBuffer.data = new Float32Array(vertices);
		this.uvBuffer.data = new Float32Array(uvs);
		this.geometry.buffers[2].data = new Uint16Array(indices);
		this.uvBuffer._updateID++;
		this.verticesBuffer._updateID++;
		this.geometry.buffers[2]._updateID++;
	}
}

/// #if EDITOR

Tilemap.__EDITOR_icon = 'tree/tileGrid';
Tilemap.__EDITOR_group = 'Basic';
Tilemap.__canNotHaveChildren = true;

__EDITOR_editableProps(Tilemap, [
	{
		type: 'splitter',
		title: 'Tilemap:',
		name: 'tile-map'
	},
	window.makeImageSelectEditablePropertyDescriptor('image', false, true),
	{
		name: 'tilemap',
		type: 'tilemap'
	},
	{
		name: 'rows',
		type: Number,
		min:8,
		max:256,
		default: 8
	},
	{
		name: 'columns',
		type: Number,
		min:8,
		max:256,
		default: 8
	},
	{
		name: 'tileW',
		type: Number,
		min:16,
		max:256,
		default: 64
	},
	{
		name: 'tileH',
		type: Number,
		min:16,
		max:256,
		default: 64
	},
	{
		name: 'wField',
		type: Number,
		min:0,
		max:128,
		default: 0
	},
	{
		name: 'hField',
		type: Number,
		min:0,
		max:128,
		default: 0
	}
]);

/// #endif