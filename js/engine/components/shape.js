import game from "../game.js";
import Lib from "../lib.js";

const SHAPE_RECT = 0;
const SHAPE_ROUND_RECT = 1;
const SHAPE_CIRCLE = 2;
const SHAPE_ELLIPSE = 3;
const SHAPE_POLY = 4;


export default class Shape extends PIXI.Graphics {

	/// #if EDITOR
	constructor() {
		super();

		this.__pointsUpdate = this.__pointsUpdate.bind(this);
		
	}

	/// #endif

	init() {
		super.init();
		this._drawThing();
		this._hitAreaCache = null;
		if(this.isItHitArea && this.parent) {
			this.applyHitAreaToParent();
		}
	}

	_drawThing() {
		this.clear();
		if(!this.isItHitArea
			/// #if EDITOR
			|| game.__EDITOR_mode
			/// #endif

		) {
			this.lineStyle(this.shapeLineWidth, this.shapeLineColor, this.shapeLineAlpha, this.shapeLineAlignment);
			this.beginFill(this.shapeFillColor, this.shapeFillAlpha);
			this.drawThing();
			this.endFill();
		}
	}

	drawThing() {
		let points;
		switch(this.shape) {
		case SHAPE_ROUND_RECT:
			this.drawRoundedRect(0,0,this.width, this.height, this.shapeRadius);
			break;
		case SHAPE_RECT:
			this.drawRect (0,0,this.width, this.height);
			break;
		case SHAPE_CIRCLE:
			this.drawCircle (0,0,this.shapeRadius);
			break;
		case SHAPE_ELLIPSE:
			this.drawEllipse (0,0,this.width, this.height);
			break;
		case SHAPE_POLY:
			/// #if EDITOR
			if(!this._shapePoints) {
				this._shapePoints = [];
			}
			while(this._shapePoints.length < DEFAULT_POINTS.length) {
				let p = {
					x: DEFAULT_POINTS[this._shapePoints.length][0],
					y: DEFAULT_POINTS[this._shapePoints.length][1]
				};
				this._shapePoints.push(p);
				Object.freeze(p);
			}
			/// #endif
			if(this._shapePoints.length > 2) {
				points = [];
				for(let c of this._shapePoints) {
					points.push(c.x, c.y);
				}
				this.drawPolygon(points);
			}
			break;
		}
	}

	getHitareaShape() {
		if(!this._hitAreaCache) {
			switch(this.shape) {
			case SHAPE_ROUND_RECT:
				this._hitAreaCache = new PIXI.RoundedRectangle(this.x, this.y, this.width, this.height, this.shapeRadius);
				break;
			case SHAPE_RECT:
				this._hitAreaCache = new PIXI.Rectangle(this.x, this.y, this.width, this.height);
				break;
			case SHAPE_CIRCLE:
				this._hitAreaCache = new PIXI.Circle(this.x, this.y, this.shapeRadius);
				break;
			case SHAPE_ELLIPSE:
				this._hitAreaCache = new PIXI.Ellipse(this.x, this.y, this.width, this.height);
				break;
	
			case SHAPE_POLY:
				if(this._shapePoints.length > 2) {
					let points = [];
					for(let c of this._shapePoints) {
						points.push(c.x + this.x, c.y + this.y);
					}
					this._hitAreaCache = new PIXI.Polygon(points);
				}
				break;
			}
		}
		return this._hitAreaCache;
	}

	applyHitAreaToParent() {
		this.parent.hitArea = this.getHitareaShape();
		this.visible = false;
	}

	onRemove() {
		super.onRemove();
		this.clear();
		if(this.isItHitArea && this.parent) {
			this.parent.hitArea = null;
		}
	}

	set shape(s) {
		this._shape = s;
		if(this.__deserialized) {
			/// #if EDITOR
			if(s === SHAPE_POLY) {
				if(!this._shapePoints) {
					this._shapePoints = [];
				}
			} else {
				this._shapePoints = undefined;
				this.__stopPointsRefreshInterval();

			}
			/// #endif

			this._drawThing();
			
			/// #if EDITOR
			if(s === SHAPE_POLY) {
				this.__startPointRefreshIfSelected();
			}
			/// #endif
		}
	}

	get shape() {
		return this._shape;
	}

	set width(s) {
		this._width = s;
		if(this.__deserialized) {
			this._drawThing();
		}
	}

	get width() {
		return this._width;
	}

	set height(s) {
		this._height = s;
		if(this.__deserialized) {
			this._drawThing();
		}
	}

	get height() {
		return this._height;
	}
	
	set shapeRadius(s) {
		this._shapeRadius = s;
		if(this.__deserialized) {
			this._drawThing();
		}
	}

	get shapeRadius() {
		return this._shapeRadius;
	}

	set shapeLineColor(s) {
		this._lColor = s;
		if(this.__deserialized) {
			this._drawThing();
		}
	}

	get shapeLineColor() {
		return this._lColor;
	}

	set shapeFillColor(s) {
		this._fColor = s;
		if(this.__deserialized) {
			this._drawThing();
		}
	}

	get shapeFillColor() {
		return this._fColor;
	}

	set shapeFillAlpha(s) {
		this._fAlpha = s;
		if(this.__deserialized) {
			this._drawThing();
		}
	}

	get shapeFillAlpha() {
		return this._fAlpha;
	}

	set shapeLineAlpha(s) {
		this._lAlpha = s;
		if(this.__deserialized) {
			this._drawThing();
		}
	}

	get shapeLineAlpha() {
		return this._lAlpha;
	}

	set shapeLineWidth(s) {
		this._lWidth = s;
		if(this.__deserialized) {
			this._drawThing();
		}
	}

	get shapeLineWidth() {
		return this._lWidth;
	}

	set shapeLineAlignment(s) {
		this._lAlignment = s;
		if(this.__deserialized) {
			this._drawThing();
		}
	}

	get shapeLineAlignment() {
		return this._lAlignment;
	}

	/// #if EDITOR

	__EDITOR_onCreate() {
		this.__deserialized = true;
		this.shape = this._shape;
	}

	__afterDeserialization() {
		this.__deserialized = true;


		//turn containers in to visible points shapes
		if(this.shape === SHAPE_POLY) {

			// convert old data
			if(!this._shapePoints) {
				this._shapePoints = this.children.map((i) => {
					return {x:i.x, y:i.y};
				});
				while(this.children.length > 0) {
					this.children[0].remove();
				}
			}
			// ================
		}

		this._drawThing();
	}

	__beforeDeserialization() {
		this.__deserialized = false;
	}

	__removePolyPoints() {
		for(let i = this.children.length -1; i >= 0; i--) {
			let c = this.children[i];
			if(c.name === '___point') {
				c.remove();
			}
		}
	}

	__afterSerialization(data) {
		if(this._shapePoints) {
			data.p._shapePoints = this._shapePoints;
		}
	}

	__onSelect() {
		super.__onSelect();
		this.__startPointRefreshIfSelected();
	}

	__onChildSelected() {
		this.__startPointRefreshIfSelected();
	}

	__showPoints() {
		if(this.shape === SHAPE_POLY) {
			if(game.__EDITOR_mode) {
				this.__removePolyPoints();
				for(let p of this._shapePoints) {
					this.__newPointView(p);
				}
			}
		}
	}

	__beforeDestroy() {
		this.__stopPointsRefreshInterval();
	}

	__stopPointsRefreshInterval() {
		if(this.__pointsUpdateIntervalInitialized) {
			this.__removePolyPoints();
			editor.refreshTreeViewAndPropertyEditor();
			clearInterval(this.__pointsUpdateIntervalInitialized);
			delete this.__pointsUpdateIntervalInitialized;
		}
	}

	__pointsUpdate() {
		let isAnyPointSelected;

		this._shapePoints = [];
		for(let o of this.children) {
			if(o.name === '___point') {
				if(__getNodeExtendData(o).isSelected) {
					isAnyPointSelected = true;
				}
				this._shapePoints.push({
					x: o.x,
					y: o.y
				});
			}
		}

		this._shapePoints.some(i => Object.freeze(i));

		this._drawThing();


		if(this.shape !== SHAPE_POLY || !isAnyPointSelected && !__getNodeExtendData(this).isSelected) {
			this.__stopPointsRefreshInterval();
		}
	}

	set _shapePoints(v) {
		this.__shapePoints = v;
		if(v) {
			for(let o of v) {
				Object.freeze(o);
			}
		}
	}

	get _shapePoints() {
		return this.__shapePoints;
	}

	__newPointView(src) {
		let p = Lib._deserializeObject({c:"Shape", p:{}});
		p.name = '___point';
		p.shape = SHAPE_RECT;
		p.width = 4;
		p.height = 4;
		p.pivot.x = 2;
		p.pivot.y = 2;
		p.alpha = 0.5;
		p.shapeFillColor = 0xffaa00;
		p.x = src.x;
		p.y = src.y;
		this.addChild(p);
		let extData = __getNodeExtendData(p);
		extData.rotatorLocked = true;
		extData.hidePropsEditor = "Polygon's vertex is selected";
		extData.noSerialize = true;
		return p;
	}

	__startPointRefreshIfSelected() {
		if(game.__EDITOR_mode && (this.shape === SHAPE_POLY) && (!this.__pointsUpdateIntervalInitialized)) {
			let isAnySelected = __getNodeExtendData(this).isSelected;
			if(!isAnySelected) {
				for(let o of this.children) {
					if((o.name === '___point') && __getNodeExtendData(o).isSelected) {
						isAnySelected = true;
						break;
					}
				}
			}

			if(isAnySelected) {
				this.__showPoints();
				this.__pointsUpdateIntervalInitialized = setInterval(this.__pointsUpdate, 40);
			}
			
		}
	}
	/// #endif
}

/// #if EDITOR

const DEFAULT_POINTS = [[-30,-30], [30, -10], [-10, 30]];

const DEFAULT_WIDTH = 100;
const DEFAULT_HEIGHT = 100;
const DEFAULT_RADIUS = 10;


Shape.__EDITOR_group = 'Extended';
Shape.__EDITOR_icon = 'tree/shape';

__EDITOR_editableProps(Shape, [
	{
		type: 'splitter',
		title: 'Shape:',
		name: 'shape-splitter'
	},
	{
		name: 'shape',
		type: Number,
		select: [
			{name:'Rect', value:SHAPE_RECT},
			{name:'Round Rect', value:SHAPE_ROUND_RECT},
			{name:'Circle', value:SHAPE_CIRCLE},
			{name:'Ellipse', value:SHAPE_ELLIPSE},
			{name:'Polygon', value:SHAPE_POLY}
		],
		important:true
	},
	{
		name: 'width',
		type: Number,
		default:DEFAULT_WIDTH,
		visible:(o) => {
			return o.shape !== SHAPE_CIRCLE && o.shape !== SHAPE_POLY;
		},
		important:true
	},
	{
		name: 'height',
		type: Number,
		default:DEFAULT_HEIGHT,
		visible:(o) => {
			return o.shape !== SHAPE_CIRCLE && o.shape !== SHAPE_POLY;
		},
		important:true
	},
	{
		name: 'shapeRadius',
		type: Number,
		default:DEFAULT_RADIUS,
		visible:(o) => {
			return o.shape === SHAPE_ROUND_RECT || o.shape === SHAPE_CIRCLE;
		},
		important:true
	},
	{
		name: 'shapeFillAlpha',
		type: Number,
		min:0,
		max:1,
		step:0.01,
		default:1
	},
	{
		name: 'shapeFillColor',
		basis: 16,
		type: Number,
		max: 0xFFFFFF,
		min: 0,
		visible:(o) => {
			return o.shapeFillAlpha > 0;
		}
	},
	{
		name:'isItHitArea',
		type: Boolean
	},
	{
		name: 'shapeLineWidth',
		type: Number,
		min:0
	},
	{
		name: 'shapeLineColor',
		basis: 16,
		type: Number,
		default: 0xFFFFFF,
		min:0,
		max:0xFFFFFF,
		visible:(o) => {
			return o.shapeLineWidth > 0;
		}
	},
	{
		name: 'shapeLineAlpha',
		type: Number,
		min:0,
		max:1,
		step:0.01,
		default:1,
		visible:(o) => {
			return o.shapeLineWidth > 0;
		}
	},
	{
		name: 'shapeLineAlignment',
		type: Number,
		min:0,
		max:1,
		step:0.01,
		default:1,
		visible:(o) => {
			return o.shapeLineWidth > 0;
		}
	},
	{
		name:'_spriteRect',
		type:'ref',
		visible:() => {
			return false;
		}
	},
	{
		name:'_shapePoints',
		type:'ref',
		visible:(o) => {
			return o.shape === SHAPE_POLY;
		}
	}
]);


/// #endif