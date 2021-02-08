import Selection from "./selection.js";
import Pool from "thing-editor/js/engine/utils/pool.js";
import DSprite from "thing-editor/js/engine/components/d-sprite.js";
import game from "thing-editor/js/engine/game.js";

let blackouts = [];
let previewBlackout;
let isolationBlackout;
let cameraFrame;

function createBlackout() {
	let b = new PIXI.Sprite();
	b.texture = PIXI.Texture.WHITE;
	b.tint = 30;
	b.alpha = 0.9;
	__getNodeExtendData(b).hidden = true;
	blackouts.push(b);
	return b;
}

let isPreviewShowed;

let draggers = [];

let selectionDisabled;
let isScrolling;
let scrollingX, scrollingY;

let helpersIsVisible = true;

let isolation = [];

function checkIfCurrentContainerIsShowedPrefab() {
	assert(isPreviewShowed === game.currentContainer.name, "game.currentContainer.name is incorrect. Prefabs name expected.");
}

function createDragger(owner, constructor) {
	let ret = Pool.create(constructor);
	draggers.push(ret);
	ret.owner = owner;
	ret.info = __getNodeExtendData(owner);
	game.pixiApp.stage.addChild(ret);
	return ret;
}

let viewportCanvasScale;

export default class Overlay {
	
	constructor() {
		game.pixiApp.ticker.add(refreshSelection);
		
		previewBlackout = createBlackout();
		isolationBlackout = createBlackout();
		isolationBlackout.anchor.x = 0.5;
		isolationBlackout.anchor.y = 0.5;
		let originalRender = isolationBlackout.render.bind(isolationBlackout);
		isolationBlackout.render = function(renderer) {
			originalRender(renderer);
			for(let o of isolation) {
				o.render(renderer);
			}
		}.bind(isolationBlackout);
		cameraFrame = new PIXI.Graphics();
		this.helpersIsVisible = true;
		this.onEditorRenderResize();
	}
	
	onEditorRenderResize() {
		for(let b of blackouts) {
			b.width = game.W * 2;
			b.height = game.H * 2;
		}
		let canvas = document.querySelector('#viewport-root canvas');
		let bounds = canvas.getBoundingClientRect();
		viewportCanvasScale = game.W / bounds.width;
		this.refreshCameraFrame();
	}

	getBGColor() {
		return previewBlackout.tint;
	}
	
	setBGColor(tint) {
		if(tint === undefined) {
			tint = 30;
		} else if(isPreviewShowed) {
			checkIfCurrentContainerIsShowedPrefab();
			editor.settings.setItem('prefab-bg'+ game.currentContainer.name, tint);
		}
		
		previewBlackout.tint = tint;
	}
	
	disableSelectionByStageClick(disable) {
		selectionDisabled = disable;
	}

	toggleIsolation() {
		if(this.isolation) {
			this.exitIsolation();
		} else {
			this.isolateSelected();
		}
	}

	isolateSelected() {
		isolation = editor.selection.slice();
		game.stage.addChild(isolationBlackout);
		isolationBlackout.parent.toLocal(editor.selection[0], editor.selection[0].parent, isolationBlackout);
		this.isolation = (isolation.length > 0) && isolation;
		editor.refreshTreeViewAndPropertyEditor();
	}

	exitIsolation() {
		if(isolation.length > 0) {
			isolation.length = 0;
			this.isolation = null;
			isolationBlackout.detachFromParent();
			editor.refreshTreeViewAndPropertyEditor();
		}
	}

	get isPreviewShowed() {
		return isPreviewShowed;
	}

	refreshCameraFrame() {
		if(game.stage.scale.x !== 1 || game.stage.x !== 0 || game.stage.y !== 0) {
			game.stage.addChild(cameraFrame); //move frame to front
			__getNodeExtendData(cameraFrame).hidden = true;
			
			if(cameraFrame.__appliedW !== game.W ||
				cameraFrame.__appliedH !== game.H) {

				const W = 40;
				cameraFrame.clear();
				cameraFrame.lineStyle(W, 0x808080, 0.4);
				cameraFrame.beginFill(0, 0);
				cameraFrame.drawRect(W/-2, W/-2, game.W + W, game.H + W);

				cameraFrame.__appliedW = game.W;
				cameraFrame.__appliedH = game.H;
			}
		} else {
			cameraFrame.detachFromParent();
		}
	}

	highlightObject(o) {
		if(!o.filters || o.filters.indexOf(highlightFilter) < 0) {
			o.addFilter(highlightFilter);
			setTimeout(() => {
				o.removeFilter(highlightFilter);
			}, 100);
			setTimeout(() => {
				o.addFilter(highlightFilter);
			}, 200);
			setTimeout(() => {
				o.removeFilter(highlightFilter);
			}, 300);
		}
	}

	guideAngle(a, from) {
		guideSprite.rotation = a;
		guideSprite.scale.x = 100;
		guideSprite.scale.y = 0.1;
		from.toGlobal({x:0, y:0}, guideSprite);
		showGuideSprite();
	}

	guideX(x, from) {
		let tx = from.scale.x;
		let ty = from.scale.y;
		from.scale.x = from.scale.y = 1;
		guideSprite.rotation = from.getGlobalRotation();
		guideSprite.scale.x = 0.1;
		guideSprite.scale.y = 100;
		from.toGlobal({x, y:0}, guideSprite);
		from.scale.x = tx;
		from.scale.y = ty;
		showGuideSprite();
	}

	guideY(y, from) {
		let tx = from.scale.x;
		let ty = from.scale.y;
		from.scale.x = from.scale.y = 1;
		guideSprite.rotation = from.getGlobalRotation();
		guideSprite.scale.x = 100;
		guideSprite.scale.y = 0.1;
		from.toGlobal({x:0, y}, guideSprite);
		from.scale.x = tx;
		from.scale.y = ty;
		showGuideSprite();
	}
	
	showPreview(object) {
		this.exitIsolation();
		editor.ui.viewport.resetZoom();
		this.setBGColor(editor.settings.getItem('prefab-bg' + object.name));
		this.hidePreview(false);
		game.stage.addChild(previewBlackout);
		isPreviewShowed = object.name;
		game.showModal(object);
		__getNodeExtendData(object).childrenExpanded = true;
		checkIfCurrentContainerIsShowedPrefab();
		game.stage.x = -object.x + game.W / 2;
		game.stage.y = -object.y + game.H / 2;
		previewBlackout.x = -game.stage.x;
		previewBlackout.y = -game.stage.y;
		setTimeout(() => {
			let selectionData = game.settings.getItem('prefab-selection' + game.currentContainer.name);
			if(selectionData) {
				editor.selection.loadSelection(selectionData);
			}
		}, 1);
		editor.history.updateUi();
		game.__loadDynamicTextures();
	}

	isDraggerOvered () {
		return overedDragger;
	}

	drawRect(props, owner, rect) {
		props.field.color = props.field.color  || 0x00ff00;

		let info = __getNodeExtendData(owner);
		if(!info.rects) {
			info.rects = {};
		}
		let r;
		if (!info.rects[props.field.name]) {
			r = createDragger(owner, Rect);
			r._props = props;
			r._rect = rect;
			info.rects[props.field.name] = r;
			__getNodeExtendData(r).hidden = true;
		} else {
			r = info.rects[props.field.name];
			r._rect = rect;
		}
		r.refresh();
	}

	hideHelpers(hideHelpers) {
		helpersIsVisible = !hideHelpers;
		this.helpersIsVisible = helpersIsVisible;
	}
	
	hidePreview(refresh = true) {
		this.exitIsolation();
		editor.ui.viewport.resetZoom();
		previewBlackout.detachFromParent();
		if (isPreviewShowed) {
			checkIfCurrentContainerIsShowedPrefab();
			let selectionData = editor.selection.saveSelection();
			game.settings.setItem('prefab-selection' + game.currentContainer.name, selectionData);	
			game.hideModal(game.currentContainer);
			isPreviewShowed = null;
			if(refresh) {
				editor.refreshTreeViewAndPropertyEditor();
			}
			editor.history.updateUi();
			game.__loadDynamicTextures();
			editor.selection.loadSelection(editor.history.currentState.selectionData);
		}
	}
}

const guideSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
guideSprite.anchor.x = 0.5;
guideSprite.anchor.y = 0.5;
let guideSpriteTimeout;

function showGuideSprite() {
	game.stage.parent.addChild(guideSprite);
	clearTimeout(guideSpriteTimeout);
	guideSpriteTimeout = setTimeout(() => {
		guideSprite.detachFromParent();
	}, 500);
}

const highlightFilter = new PIXI.filters.OutlineFilter(2, 0xff0000);

const p = new PIXI.Point();
let overedDragger, draggingDragger;

let currentPointer = 'initial';

function refreshSelection() {
	overedDragger = null;
	let i = draggers.length - 1;
	
	while (i >= 0) {
		let d = draggers[i];
		d.visible = helpersIsVisible && !document.fullscreenElement;
		let info = __getNodeExtendData(d.owner);
		if (!info.isSelected || d.info !== info) {
			d.detachFromParent();
			Pool.dispose(d);
			info.draggerPivot = null;
			info.draggerRotator = null;
			info.rects = null;
			draggers.splice(i, 1);
		}
		if(helpersIsVisible && !(d instanceof Rect)) {
			let s = 6 * viewportCanvasScale;
			if ((Math.abs(d.x - game.mouse.__EDITOR_x) < s) && (Math.abs(d.y - game.mouse.__EDITOR_y) < s)) {
				overedDragger = d;
			}
		}
		i--;
	}
	let newPointer = overedDragger ? ((overedDragger instanceof Rotator) ? 'pointer' : 'move') : 'initial';
	if(currentPointer !== newPointer) {
		game.pixiApp.view.style.cursor = newPointer;
		currentPointer = newPointer;
	}
	
	editor.selection.some(refreshDraggersForNode);
}

function refreshDraggersForNode(o) {
	let info = __getNodeExtendData(o);
	if (!info.draggerPivot) {
		info.draggerPivot = createDragger(o, Dragger);
		if(!info.rotatorLocked) {
			info.draggerRotator = createDragger(o, Rotator);
		}
	}
	let draggersScale = viewportCanvasScale;

	let r = o.getGlobalRotation();
	o.getGlobalPosition(p, true);
	info.draggerPivot.x = p.x;
	info.draggerPivot.y = p.y;
	info.draggerPivot.scale.x = info.draggerPivot.scale.y = draggersScale;

	for(let rn in info.rects) {
		let rect = info.rects[rn];
		rect.x = p.x;
		rect.y = p.y;
		rect.scale.x = rect.scale.y = game.stage.scale.x;
		if(rect._props.field.rotable) {
			rect.rotation = r;
		}
		if(!rect._props.field.notScalable) {
			rect.scale.x = o.worldTransform.a;
			rect.scale.y = o.worldTransform.d;
		}
	}
	if(info.draggerRotator) {
		info.draggerRotator.x = p.x + Math.cos(r) * 40 * draggersScale;
		info.draggerRotator.y = p.y + Math.sin(r) * 40 * draggersScale;
		info.draggerRotator.scale.x = info.draggerRotator.scale.y = draggersScale;
		info.draggerRotator.rotation = r;
	}
}

let startX, startY;
let shiftX, shiftY;

window.addEventListener('mousedown', function onMouseDown(ev) {
	if(game.pixiApp && (ev.target === game.pixiApp.view)) {
		if(ev.buttons === 4) {
			isScrolling = true;
			scrollingX = game.mouse.__EDITOR_x;
			scrollingY = game.mouse.__EDITOR_y;
		} else {
			if (overedDragger) {
				if(overedDragger instanceof Rotator && ev.buttons === 2) {
					editor.onSelectedPropsChange('rotation', 0);
				} else if (ev.buttons === 1 || ev.buttons === 2) {
					draggingDragger = overedDragger;
				}
			} else if(!selectionDisabled && ev.buttons === 1) {
				selectByStageClick(ev);
			} else if(!selectionDisabled && ev.buttons === 2 && editor.selection.length > 0) {
				let info = __getNodeExtendData(editor.selection[0]);
				if(info.draggerPivot && info.draggerPivot.owner.parent) {
					draggingDragger = info.draggerPivot;
				}
			}
			if(draggingDragger) {
				startX = draggingDragger.x;
				startY = draggingDragger.y;
				if(ev.buttons === 2) {
					shiftX = 0;
					shiftY = 0;
				} else {
					shiftX = draggingDragger.x - game.mouse.__EDITOR_x;
					shiftY = draggingDragger.y - game.mouse.__EDITOR_y;
				}
				if(ev.altKey) {
					let clone = editor.cloneSelected(draggingDragger.owner);
					if(clone) {
						refreshDraggersForNode(clone);
						if(__getNodeExtendData(draggingDragger.owner).draggerPivot === draggingDragger) {
							draggingDragger = __getNodeExtendData(clone).draggerPivot;
						} else {
							draggingDragger = __getNodeExtendData(clone).draggerRotator;
						}
					} else {
						draggingDragger = null;
						return;
					}
				}
				draggingDragger.onDrag();
			}
		}
	}
});

function isObjectUnder(o) {
	return (o.containsPoint && (!o.__lockSelection) && o.worldVisible && o.containsPoint(game.__mouse_EDITOR));
}

let previousAllUnderMouse;
function selectByStageClick(ev) {

	if(document.fullscreenElement) {
		return;
	}

	let allUnderMouse = new Selection();
	let i;

	const checkNodeToSelect = (o) => {
		if(isObjectUnder(o)) {
			let parentWhichHideChildren = getParentWhichHideChildren(o);
			if(parentWhichHideChildren) {
				if((parentWhichHideChildren !== game.stage) && (allUnderMouse.indexOf(parentWhichHideChildren) < 0)) {
					allUnderMouse.push(parentWhichHideChildren);
				}
			} else {
				let p = o;
				while(p) {
					if(p === game.stage) {
						allUnderMouse.push(o);
						break;
					}
					if(p.__lockSelection) {
						break;
					}
					p = p.parent;
				}
				
			}
		}
	};

	let a;
	if(isolation.length > 0) {
		a = isolation;
	} else {
		a = [isPreviewShowed ? game.currentContainer : game.stage];
	}
	for(let c of a) {
		checkNodeToSelect(c);
		c.forAllChildren(checkNodeToSelect);
	}

	allUnderMouse.sortSelectedNodes();
	allUnderMouse.reverse();
	
	if(allUnderMouse.length > 0) {
		if(!previousAllUnderMouse || previousAllUnderMouse.some((prevObj, i) => {
			return prevObj !== allUnderMouse[i];
		})) {
			i = 0;
		} else {
			i = allUnderMouse.indexOf(getParentWhichHideChildren(editor.selection[0]) || editor.selection[0]) + 1;
		}
		let o = allUnderMouse[i % allUnderMouse.length];
		editor.ui.sceneTree.selectInTree(o, ev.ctrlKey);
	} else {
		editor.selection.clearSelection(true);
	}
	previousAllUnderMouse = allUnderMouse;
}
Overlay.getParentWhichHideChildren = getParentWhichHideChildren;


function getParentWhichHideChildren(o, closest = false) {
	let parents = [];
	while(o) {
		parents.unshift(o);
		o = o.parent;
	}

	if(closest) {
		parents.reverse();
	}

	for(let i = 0; i < parents.length; i++) {
		o = parents[i];
		
		let d = __getNodeExtendData(o);
		if(d.hideAllChildren) {
			return o;
		}
		if(d.hidden) {
			if(!closest) {
				assert(i > 0, "Cannot get parent hides children.");
				return parents[i-1];
			} else {
				assert(i < (parents.length - 1), "Cannot get parent hides children.");
				return parents[i+1];
			}
		}
		if(o.__hideChildren) {
			return o;
		}
	}
}

window.addEventListener('mousemove', function onMouseMove(ev) {
	if(isScrolling) {
		if(ev.buttons !== 4) {
			isScrolling = false;
		} else {
			let dX = game.mouse.__EDITOR_x - scrollingX;
			let dY =  game.mouse.__EDITOR_y - scrollingY;
			game.stage.x += dX;
			game.stage.y += dY;

			
			scrollingX =  game.mouse.__EDITOR_x;
			scrollingY =  game.mouse.__EDITOR_y;
			editor.overlay.refreshCameraFrame();
		}
	}
	if (draggingDragger && draggingDragger.owner.parent) {
		draggingDragger.onDrag();
	}
});

window.addEventListener('mouseup', () => {
	draggingDragger = null;
});

window.addEventListener('wheel', function onWheel(ev) {
	if(game.pixiApp && (ev.target === game.pixiApp.view)) {

		let pivot = game.stage.toLocal(game.__mouse_EDITOR, game.stage.parent);


		let zoom = game.stage.scale.x;
		zoom *= 1 - ev.deltaY/1000;

		if(Math.abs(zoom - 1.0) < 0.01) {
			zoom = 1;
		}
		if(zoom > 32) {
			zoom = 32;
		}
		if(zoom < 0.02) {
			zoom = 0.02;
		}
		game.stage.x += (pivot.x * game.stage.scale.x - pivot.x * zoom);
		game.stage.y += (pivot.y * game.stage.scale.y - pivot.y * zoom);

		game.stage.scale.x = zoom;
		game.stage.scale.y = zoom;
		editor.overlay.refreshCameraFrame();
	}
});

class Dragger extends DSprite {
	constructor() {
		super();
		this.texture = PIXI.Texture.from('img/overlay/pivot.png');
	}
	
	onDrag() {
		let o = this.owner;
		let info = __getNodeExtendData(o);
		if(info.draggerPivot) {
		
			if(game.keys.shiftKey) {
				let dX = game.mouse.__EDITOR_x + shiftX - startX;
				let dY = game.mouse.__EDITOR_y + shiftY - startY;
				let angle = Math.atan2(dY, dX);
				angle /= Math.PI;
				angle *= 4;
				angle = Math.round(angle);
				angle /= 4.0;
				angle *= Math.PI;
				
				let len = Math.sqrt(dX * dX + dY * dY);
				p.x = startX + Math.cos(angle) * len;
				p.y = startY + Math.sin(angle) * len;
				editor.overlay.guideAngle(angle, o);
			} else {
				p.x = game.mouse.__EDITOR_x + shiftX;
				p.y = game.mouse.__EDITOR_y + shiftY;
			}
			
			o.parent.toLocal(p, undefined, p, true);
			if(isNaN(p.x)) {
				let parent = o.parent;
				while (parent) {
					if(parent.scale.x === 0) {
						editor.ui.status.warn("Can not drag object because it`s parent has zero scale.x", undefined, parent, 'scale.x');
						return;
					}
					if(parent.scale.y === 0) {
						editor.ui.status.warn("Can not drag object because it`s parent has zero scale.y", undefined, parent, 'scale.y');
						return;
					}
					parent = parent.parent;
				}
				editor.ui.status.warn("Can not move object.", undefined, o);
				return;
			}
			let dX = (Math.round(p.x) - o.x);
			let dY = (Math.round(p.y) - o.y);
			
			if(game.keys.ctrlKey) {
				for(let s of editor.selection) {
					editor.moveContainerWithoutChildren(s, dX, dY);
				}
			} else {
				editor.onSelectedPropsChange('x', dX, true);
				editor.onSelectedPropsChange('y', dY, true);
			}
		}
	}
}

class Rotator extends DSprite {
	constructor() {
		super();
		this.texture = PIXI.Texture.from('img/overlay/rotator.png');
	}
	
	onDrag() {
		let o = this.owner;
		let info = __getNodeExtendData(o);
		if(info.draggerPivot) {
			let r = Math.atan2(game.mouse.__EDITOR_y + shiftY - info.draggerPivot.y, game.mouse.__EDITOR_x + shiftX - info.draggerPivot.x);
			if (game.keys.shiftKey) {
				r = Math.round(r / Math.PI * 8.0) / 8.0 * Math.PI;
			} else {
				r = Math.round(r * 1000.0) / 1000.0;
			}
			editor.onSelectedPropsChange('rotation', r - info.draggerRotator.rotation, true);
		}
	}
}

class Rect extends PIXI.Graphics {
	refresh() {
		let r = this._rect;
		if(!r || r.removed) {
			this.clear();
			this._drawedColor = false;
			return;
		}
		if(
			this._drawedColor !== this._props.field.color ||
			this._drawedW !== r.w ||
			this._drawedH !== r.h ||
			this._drawedX !== r.x ||
			this._drawedY !== r.y
		) {
			this.clear();
			this.lineStyle(2 * viewportCanvasScale, this._props.field.color, 0.6, 0);
			this.beginFill(0, 0);
			this.drawRect (r.x, r.y, r.w, r.h);
			this.endFill();

			this._drawedColor = this._props.field.color;
			this._drawedW = r.w;
			this._drawedH = r.h;
			this._drawedX = r.x;
			this._drawedY = r.y;
		}
	}
}