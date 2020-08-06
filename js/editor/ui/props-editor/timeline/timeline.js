import MovieClip from "thing-editor/js/engine/components/movie-clip/movie-clip.js";
import ObjectsTimeline from "./objects-timeline.js";
import TimeMarker from "./time-marker.js";
import game from "thing-editor/js/engine/game.js";
import TimelineKeyframe from "./timeline-keyframe.js";
import KeyframePropertyEditor from "./keyframe-property-editor.js";
import Line from "./timeline-line.js";
import TimeLabel from "./timeline-label.js";
import TimelineLoopPoint from "./timeline-loop-point.js";
import TimelineSelectFrame from "./timeline-select-frame.js";
import Lib from "thing-editor/js/engine/lib.js";
import Window from "../../window.js";


let widthZoom;
let heightZoom;

let timeMarker;
function timeMarkerRef(ref) {
	timeMarker = ref;
}

let selectionFrame;

function selectionFrameRef(ref) {
	selectionFrame = ref;
}

let beforeChangeRemember;

let timeDragging;

let recordingIsDisabled;
let timelineInstance;
const justModifiedKeyframes = new Set();

const selectedComponents = [];
function clearSelection() {
	while (selectedComponents.length > 0) {
		unselect(selectedComponents[selectedComponents.length - 1]);
	}
}

function select(component) {
	let k = component.props.keyFrame;
	if(k) {
		k.___keepLoopPoint = (k.t !== k.j);
	}
	assert(selectedComponents.indexOf(component) < 0, "Component already selected");
	component.setState({isSelected: true});
	selectedComponents.push(component);
	KeyframePropertyEditor.refresh();
}

function unselect(component) {
	let k = component.props.keyFrame;
	if(k) {
		delete k.___keepLoopPoint;
	}
	let i = selectedComponents.indexOf(component);
	assert(i >= 0, "Component is not selected");
	component.setState({isSelected: false});
	selectedComponents.splice(i, 1);
	KeyframePropertyEditor.refresh();
}

export default class Timeline extends React.Component {
	constructor(props) {
		super(props);

		heightZoom = editor.settings.getItem('timeline-height-zoom', 40);
		widthZoom = editor.settings.getItem('timeline-width-zoom', 3);
		this.state = {
			heightZoom,
			widthZoom
		};
		this.deleteSelectedKeyframes = this.deleteSelectedKeyframes.bind(this);
		this.prevKeyFrame = this.prevKeyFrame.bind(this);
		this.nextKeyFrame = this.nextKeyFrame.bind(this);
		this.prevFrame = this.prevFrame.bind(this);
		this.nextFrame = this.nextFrame.bind(this);
		this.renderObjectsTimeline = this.renderObjectsTimeline.bind(this);
		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		this.onMouseUp = this.onMouseUp.bind(this);
		this.verticalZoomIn = this.verticalZoomIn.bind(this);
		this.verticalZoomOut = this.verticalZoomOut.bind(this);
		this._afterHistoryJump = this._afterHistoryJump.bind(this);
		this.horizontalZoomIn = this.horizontalZoomIn.bind(this);
		this.horizontalZoomOut = this.horizontalZoomOut.bind(this);
		this._afterHistoryJump = this._afterHistoryJump.bind(this);
	}

	static get isElementsSelected() {
		return selectedComponents.length > 0;
	}

	static get isPasteAvailable() {
		return editor.settings.getItem('__EDITOR-clipboard-data-timeline-name');
	}

	static copySelection() {
		let keyframesCount = 0;
		let labels = [];
		let fields = [];
		let fieldsByName = {};
		let addedFramesCheck = {};
		selectedComponents.forEach((c) => {
			if(c instanceof TimelineKeyframe) {
				let k = {};
				for(let name in c.props.keyFrame) {
					if((name.length === 1) && (name !== 'n')) {
						k[name] = c.props.keyFrame[name];
					}
				}
				keyframesCount++;
				let fieledName = c.props.owner.props.owner.props.field.n;
				fieldsByName[fieledName] = fieldsByName[fieledName] || [];

				let hash = k.t + '_' + fieledName;
				assert(!addedFramesCheck[hash]);
				addedFramesCheck[hash] = true;
				
				fieldsByName[fieledName].push(k);
			} else if(c instanceof TimeLabel) {
				labels.push({n: c.props.labelName, t: c.props.label.t});
			}
		});
		for(let name in fieldsByName) {
			fields.push({name, keyframes: fieldsByName[name]});
		}

		if((labels.length > 0) || (keyframesCount > 0)) {
			editor.settings.setItem('__EDITOR-clipboard-data-timeline', {
				fields,
				labels,
				p: editor.selection[0]._timelineData.p,
				d:  editor.selection[0]._timelineData.d
			});
			let name = "";
			if(keyframesCount) {
				name += "Keyframes: " + keyframesCount;
			}
			if(labels.length) {
				if(name) {
					name += '\n';
				}
				name += "Labels: " + labels.length;
			}
			editor.settings.removeItem('__EDITOR-clipboard-data');
			editor.settings.setItem('__EDITOR-clipboard-data-timeline-name', 'Paste: \n'+ name);
			editor.ui.modal.notify("Copied: " + name);
			editor.refreshTreeViewAndPropertyEditor();
		}
	}

	static pasteSelection() {
		let data = editor.settings.getItem('__EDITOR-clipboard-data-timeline');
		if(data) {
			
			let allKeyframesToSelect = [];
			for(let o of editor.selection) {

				if(!o._timelineData) {
					o._timelineData = {l:{}, f:[], p: data.p, d: data.d};
				}
				let tl = o._timelineData;

				for(let labelData of data.labels) {
					if(!tl.l[labelData.n]) {
						let l = {t: labelData.t};
						tl.l[labelData.n] = l;
					}
					allKeyframesToSelect.push(tl.l[labelData.n]);
				}
				for(let field of data.fields) {
					for(let keyframeData of field.keyframes) {
						let k = getFrameAtTimeOrCreate(o, field.name, keyframeData.t);
						Object.assign(k, keyframeData);
						allKeyframesToSelect.push(k);
					}
				}
				TimeLabel.renormalizeAllLabels(o);
				Timeline.allFieldDataChanged(o);
			}
			timelineInstance.forceUpdateDebounced();
			setTimeout(() => {
				clearSelection();
				allKeyframesToSelect.forEach((kf) => {
					select(kf.___view);
				});
			}, 1);
			editor.sceneModified();
		}
	}

	static unselectKeyframe(keyframe) {
		for (let c of selectedComponents) {
			if (c.props.keyFrame === keyframe) {
				unselect(c);
				return;
			}
		}
	}

	static unselectComponent(loopPointView) {
		if(selectedComponents.indexOf(loopPointView) >= 0) {
			unselect(loopPointView);
		}
	}

	selectKeyframe(kf) {
		clearSelection();
		select(kf.___view);
		this.setTime(kf.t, true);
	}

	componentDidMount() {
		clearSelection();
		Timeline.timelineDOMElement = document.querySelector('.timeline');
		timelineInstance = this;
		window.addEventListener('mousemove', this.onMouseMove);
		window.addEventListener('mouseup', this.onMouseUp);
		editor.history.beforeHistoryJump.add(this._beforeHistoryJump);
		editor.history.afterHistoryJump.add(this._afterHistoryJump);
		this._syncOtherMovieclips(this.getTime());
	}

	static deselectMovieClip(o) {
		for(let i = selectedComponents.length - 1; i >= 0; i--) {
			let c = selectedComponents[i];
			if(c instanceof TimelineKeyframe) {
				if(c.props.owner.props.owner.props.owner.props.node === o) {
					unselect(c);
				}
			}
		}
	}

	static init() {
		editor.beforePropertyChanged.add(Timeline.onBeforePropertyChanged);
		editor.afterPropertyChanged.add(Timeline.onAfterPropertyChanged);
	}

	UNSAFE_componentWillReceiveProps() { 
		this._syncOtherMovieclips(this.getTime());
	}

	componentWillUnmount() {
		Timeline.timelineDOMElement = null;
		timelineInstance = null;
		editor.history.beforeHistoryJump.remove(this._beforeHistoryJump);
		editor.history.afterHistoryJump.remove(this._afterHistoryJump);
		window.removeEventListener('mousemove', this.onMouseMove);
		window.removeEventListener('mouseup', this.onMouseUp);
	}

	verticalZoomIn() {
		this.verticalZoom(1.5);
	}

	verticalZoomOut() {
		this.verticalZoom(0.66666666);
	}

	deleteSelectedKeyframes() {
		let i = selectedComponents.length - 1;
		if(i < 0) {
			return;
		}
		while(i >= 0) {
			let c = selectedComponents[i];
			if(c instanceof TimelineKeyframe) {
				c.props.owner.props.owner.deleteKeyframe(c.props.keyFrame);
			} else if(c instanceof TimeLabel) {
				c.deleteLabel();
			} else if(c instanceof TimelineLoopPoint) {
				c.deleteLoopPoint();
			}
			i--;
		}
	}

	verticalZoom(delta) {
	
		heightZoom = this.state.heightZoom;
		let tmp = heightZoom;

		heightZoom *= delta;
		if (heightZoom < 20) {
			heightZoom = 20;
		} else if (heightZoom > 135) {
			heightZoom = 135;
		}
		if (tmp !== heightZoom) {
			editor.settings.setItem('timeline-height-zoom', heightZoom);
			heightZoom = Math.floor(heightZoom);
			Line.invalidateChartsRenderCache();
			this.setState({heightZoom});
			this.centralizeSelection();
		}
	}

	horizontalZoomIn() {
		this.horizontalZoom(1.5);
	}

	horizontalZoomOut() {
		this.horizontalZoom(0.66666666);
	}

	horizontalZoom(delta) {
		widthZoom = this.state.widthZoom;
		let tmp = widthZoom;
		widthZoom *= delta;
		if (widthZoom < 0.5) {
			widthZoom = 0.5;
		} else if (widthZoom > 28.5) {
			widthZoom = 28.5;
		}
		if (tmp !== widthZoom) {
			editor.settings.setItem('timeline-width-zoom', widthZoom);
			if(widthZoom < 1.00001) {
				widthZoom = Math.round(widthZoom * 20) / 20.0;
			} else {
				widthZoom = Math.round(widthZoom);
			}
			Line.invalidateChartsRenderCache();
			this.setState({widthZoom});
			this.centralizeSelection();
		}
	}

	centralizeSelection() {
		setTimeout(() => {
			if (selectedComponents.length > 0) {
				timeMarker.scrollInToView(selectedComponents[0].getTime());
			}
		}, 0);
	}

	nextKeyFrame() {
		let time = this.getTime();
		let allKeyframes = this._getAllKeyframes();
		for(let k of allKeyframes) {
			if(k.t > time) {
				this.selectKeyframe(k);
				return;
			}
		}
		this.selectKeyframe(allKeyframes[0]);
	}

	_getAllKeyframes() {
		let allKeyframes = [];
		for(let m of editor.selection) {
			if(m instanceof MovieClip && m._timelineData) {
				for( let f of m._timelineData.f) {
					allKeyframes = allKeyframes.concat(f.t);
				}
			}
		}
		allKeyframes.sort(sortFieldsByTime);
		return allKeyframes;
	}

	prevKeyFrame() {
		let time = this.getTime();
		let allKeyframes = this._getAllKeyframes();
		if(allKeyframes.length > 0) {
			if(time === 0) {
				this.selectKeyframe(allKeyframes[allKeyframes.length - 1]);
			} else {
				let reClosestKeyframe = allKeyframes[0];
				for(let k of allKeyframes) {
					if(k.t >= time) {
						this.selectKeyframe(reClosestKeyframe);
						return;
					}
					reClosestKeyframe = k;
				}
			}
		}
	}

	prevFrame() {
		this.setTime(Math.max(0, this.getTime() - 1), true);
	}

	nextFrame() {
		this.setTime(this.getTime() + 1, true);
	}

	renderObjectsTimeline(node) {
		let key = node.___id;
		if(node instanceof MovieClip) {
			return React.createElement(ObjectsTimeline, {owner:this, node, key,
				heightZoom,
				widthZoom
			});
		} else {
			return R.div({key});
		}
	}

	getTime() {
		return timeMarker.state.time;
	}

	setTime(time, scrollInToView) {
		timeMarker.setTime(time, scrollInToView);
		this._syncOtherMovieclips(time);
		editor.refreshPropsEditor();
	}

	_syncOtherMovieclips(time) {
		if(!game.__EDITOR_mode || !editor.selection[0]._timelineData) {
			return;
		}

		this.applyCurrentTimeValuesToFields(editor.selection, time);
		
		// apply same animation state to all movieClips around
		let nextLeftLabel;
		let nextLeftLabelName;

		for(let labelName in editor.selection[0]._timelineData.l) {
			let label = editor.selection[0]._timelineData.l[labelName];
			if((label.t <= time) && (!nextLeftLabel || nextLeftLabel.t < label.t)) {
				nextLeftLabel = label;
				nextLeftLabelName = labelName;
			}
		}
		if(nextLeftLabel && game.currentContainer) {
			let labelShift = time - nextLeftLabel.t;
			let a = game.currentContainer.findChildrenByType(MovieClip);
			if(game.currentContainer instanceof MovieClip) {
				a.push(game.currentContainer);
			}
			for(let m of a) {
				if(!__getNodeExtendData(m).isSelected) {
					if(m.hasLabel(nextLeftLabelName)) {
						let time = m._timelineData.l[nextLeftLabelName].t + labelShift;
						m.__applyCurrentTimeValuesToFields(time);
					} else {
						m.resetTimeline();
					}
				}
			}
		}
	}

	applyCurrentTimeValuesToFields(nodes, time) {
		if (game.__EDITOR_mode) {
			if(isNaN(time)) {
				time = this.getTime();
			}
			nodes.some((o) => {
				o.__applyCurrentTimeValuesToFields(time);
			});
		}
	}

	startTimeDragging() {
		timeDragging = true;

	}

	render() {
		return R.fragment(
			(selectedComponents.length > 0) ? R.btn('', this.deleteSelectedKeyframes, undefined, 'hidden', 46) : undefined,
			R.btn('×', this.props.onCloseClick, 'Hide timeline', 'close-window-btn'),
			R.div(
				{
					onScroll: onTimelineScroll,
					onMouseDown: this.onMouseDown,
					className: 'timeline'
				},
				React.createElement(TimeMarker, {
					owner: this,
					ref: timeMarkerRef
				}),
				editor.selection.map(this.renderObjectsTimeline)
			),
			React.createElement(KeyframePropertyEditor, {
				className: game.__EDITOR_mode ? undefined : 'disabled',
				owner: this,
				keyframesGetter: getSelectedKeyframes
			}),
			React.createElement(TimelineSelectFrame, {
				className: game.__EDITOR_mode ? undefined : 'disabled',
				ref: selectionFrameRef
			}),
			R.span(
				{
					style: {
						display: 'none'
					}
				},
				R.btn('<', this.prevFrame, undefined, undefined, 188),
				R.btn('>', this.nextFrame, undefined, undefined, 190),
				R.btn('<<', this.prevKeyFrame, undefined, undefined, 1188),
				R.btn('>>', this.nextKeyFrame, undefined, undefined, 1190)
			)
		);

	}

	onMouseUp(ev) {
		timeDragging = false;
		if (draggingComponent) {
			if (reduceRepeatingKeyframesInSelected()) {
				this.forceUpdateDebounced();
			}
			if((ev.clientX > 0) && !ev.ctrlKey && (Math.abs(draggingStartX - ev.clientX) < 2)) {
				if(selectedComponents.length > 1) {
					clearSelection();
					select(draggingComponent);
				}

			}
			draggingXShift = 0;
			draggingComponent = null;
		} else {
			let selectedRect = selectionFrame.getRectAndFinishDragging();
			if (selectedRect) {
				selectElementsInRectangle(selectedRect, ev.shiftKey);
			}
		}
	}

	onMouseDown(ev) {
		isDragging = true;
		this.onMouseMove(ev);
		if (!draggingComponent && !ev.ctrlKey && !timeDragging) {
			selectionFrame.onMouseDown(ev);
		}
	}

	onMouseMove(ev) {
		if(!Window.all.timeline) {
			return;
		}
		if (Math.abs(draggingStartX - ev.clientX) > 20) {
			draggingStartX = -10000;
		}

		isDragging = isDragging && ev.buttons > 0;

		let time = Timeline.mouseEventToTime(ev);
		if (isDragging) {
			if (draggingComponent) {
				if(ev.buttons === 1) {
					let delta = time - prevDragTime;
					if (delta !== 0) {
						for (let c of selectedComponents) {
							let t = c.getTime();
							delta = Math.max(0, t + delta) - t;
							if (delta === 0) {
								return;
							}
						}
						for (let c of selectedComponents) {
							c.setTime(c.getTime() + delta);
						}

						prevDragTime += delta;
					}
					this.setTime(prevDragTime, true);
				}
			} else {
				if (ev.ctrlKey) {
					for (let c of selectedComponents) {
						if (c instanceof TimelineKeyframe || c instanceof TimelineLoopPoint) {
							let kf = c.props.keyFrame;
							if (kf.j !== time) {
								kf.j = time;
								c.onChanged();
								c.props.owner.forceUpdate();
								KeyframePropertyEditor.refresh();
							}
						}
					}
				}
			}
		}
		if(timeDragging) {
			this.setTime(time);
		}
		selectionFrame.onMouseMove(ev);
	}

	forceUpdateDebounced() {
		if(!this.forceUpdateDebouncedTimer) {
			this.forceUpdateDebouncedTimer = setTimeout(() => {
				this.forceUpdateDebouncedTimer = null;
				this.forceUpdate();
			}, 0);
		}
	}

	static unregisterDraggableComponent(component) {
		let i = selectedComponents.indexOf(component);
		if (i >= 0) {
			selectedComponents.splice(i, 1);
		}
	}

	static registerDraggableComponent(component) {
		assert(component.getTime && component.setTime, "Draggable component should have 'getTime', 'setTime(time)' function as dragging interface");
		component.onDraggableMouseDown = onDraggableMouseDown.bind(component);
	}

	static allFieldDataChanged(movieClip) {
		for (let f of movieClip._timelineData.f) {
			Timeline.fieldDataChanged(f, movieClip);
		}
		Timeline._invalidateNodeCache(movieClip);
	}

	static fieldDataChanged(fieldData, node) { //invalidate cache
		assert(node instanceof MovieClip, 'Movieclip expected');
		assert(node._timelineData.f.indexOf(fieldData) >= 0, 'field data is not beyond this movieclip.');
		let timeLineData = fieldData.t;

		timeLineData.sort(sortFieldsByTime);
		for (let field of timeLineData) {
			field.n = MovieClip._findNextKeyframe(timeLineData, field.j);
		}

		fieldData.___cacheTimeline = false;
		Line.invalidateChartsRenderCache(fieldData);
		Timeline._invalidateNodeCache(node);
	}

	static _invalidateNodeCache(node) {
		MovieClip.invalidateSerializeCache(node);
		TimeLabel.renormalizeAllLabels(node);
		editor.sceneModified();
	}

	static _justModifiedSelectable(keyFrame) {
		justModifiedKeyframes.add(keyFrame);
	}

	_beforeHistoryJump() {
		justModifiedKeyframes.clear();
	}

	_afterHistoryJump() {
		setTimeout(() => {
			let v = justModifiedKeyframes.values();
			if (v.length > 0) {
				clearSelection();
				for (let c of v) {
					select(c);
				}
				if(timeMarker) {
					this.setTime(v[0].getTime(), true);
				}
			}
		}, 0);
	}

	static onBeforePropertyChanged(o, fieldName) {
		if ((!Timeline.timelineDOMElement) || recordingIsDisabled) {
			beforeChangeRemember = new WeakMap();
		}

		if (o instanceof MovieClip) {
			if (Timeline.timelineDOMElement && !recordingIsDisabled) {
				if (timelineInstance.isNeedAnimateProperty(o, fieldName)) {
					getFrameAtTimeOrCreate(o, fieldName, 0);
				}
			} else {
				let editableField = editor.getObjectField(o, fieldName);

				if (editableField.type === Number) {
					beforeChangeRemember.set(o, o[fieldName]);
				} else if(game.__EDITOR_mode && getFieldByName(o, fieldName)) {
					editor.ui.modal.showInfo("Could not change '" + fieldName + "' field`s  value, because '" + fieldName + "' field is animated and it`s type is not numeric", "Could not change '" + fieldName + "' value", 99999);
				}
			}
		}
	}

	static onAfterPropertyChanged(o, fieldName, field, val, delta) {

		if (o instanceof MovieClip) {
			if (Timeline.timelineDOMElement && !recordingIsDisabled) {
				if (timelineInstance.isNeedAnimateProperty(o, fieldName)) {
					timelineInstance.createKeyframeWithCurrentObjectsValue(o, fieldName, undefined, delta, val);
				}
			} else { //shift all keyframes instead of add keyframe
				let editableField = editor.getObjectField(o, fieldName);
				if (editableField.type === Number) {
					let val = o[fieldName];
					let oldVal = beforeChangeRemember.get(o);
					if (oldVal !== val) {
						let delta = val - oldVal;
						let fld = getFieldByName(o, fieldName);
						if (fld) {
							for (let kf of fld.t) {
								let changedVal = kf.v + delta;
								if (field.hasOwnProperty('min')) {
									changedVal = Math.max(field.min, changedVal);
								}
								if (field.hasOwnProperty('max')) {
									changedVal = Math.min(field.max, changedVal);
								}
								kf.v = changedVal;
							}
							Timeline.fieldDataChanged(fld, o);
						}
					}
				}
				if (game.__EDITOR_mode) {
					o.resetTimeline();
				}
			}
		}

		if (timelineInstance) {
			timelineInstance.forceUpdateDebounced();
		}
	}

	isNeedAnimateProperty(o, fieldName) {
		return (this.getTime() > 0 && 
		
		!editor.getObjectField(o, fieldName).notAnimate &&
		!fieldName.startsWith('__')) || getFieldByName(o, fieldName);
	}

	static disableRecording() {
		recordingIsDisabled = true;
	}

	static enableRecording() {
		recordingIsDisabled = false;
	}

	createKeyframeWithCurrentObjectsValue(o, fieldName, time, isDelta, deltaValue) {
		let keyFrame = getFrameAtTimeOrCreate(o, fieldName, time || this.getTime());
		if(isDelta && !getFrameAtTimeOrCreateReturnedNewKeyframe) {
			let editableField = editor.getObjectField(o, fieldName);
			let step = editableField.step || 1;
			keyFrame.v = Math.round((keyFrame.v + deltaValue) / step) * step;

		} else {
			keyFrame.v = o[fieldName];
		}
		let field = getFieldByNameOrCreate(o, fieldName);
		Timeline.fieldDataChanged(field, o);
		if(isDelta && keyFrame.___view) {
			let timelineVal = MovieClip.__getValueAtTime(field, keyFrame.t);
			if(!isNaN(timelineVal)) {
				o[fieldName] = timelineVal;
			}
		}
	}

	static mouseEventToTime(ev) {
		let tl = Timeline.timelineDOMElement;
		let b = tl.getBoundingClientRect();
		let s = Window.all.timeline.state.renderedScale;
		
		let x = ev.clientX - 110 * s - b.x - draggingXShift;
		return Math.max(0, Math.round((x + tl.scrollLeft * s) / widthZoom / s));
	}

	static onAutoSelect(selectPath) {
		for(let o of editor.selection) {
			if(o._timelineData) {
				if(!selectPath[1]) { //label
					getTimelineWindow('#timeline-label-' + selectPath[2].replace('.', '-').replace('#', '-')).then((labelView) => {
						window.shakeDomElement(labelView);
					});
					return;
				} else  {
					for(let f of o._timelineData.f) {
						if(f.n === selectPath[1]) {
							let time = parseInt(selectPath[2]);
							for(let kf of f.t) {
								if(kf.t == time) {
									if(!kf.___view.state || ! kf.___view.state.isSelected) {
										select(kf.___view);
										let kfNode = ReactDOM.findDOMNode(kf.___view);
										if(kfNode) {
											kfNode.scrollIntoView({block: "center", inline: "center"});
											window.shakeDomElement(kfNode);
										}
										timelineInstance.forceUpdateDebounced();
									}

									getTimelineWindow('.bottom-panel').then((w) => {
										let actionEditField = w.querySelector('.props-editor-callback');
										window.shakeDomElement(actionEditField);
									});

									return;
								}
							}
						}
					}
				}
			}
		}
	}
}

function getTimelineWindow(childSelector) {
	return new Promise((resolve) => {
		let interval = setInterval(() => {
			let w = document.querySelector('#window-timeline');
			if(w) {
				if(childSelector) {
					w = w.querySelector(childSelector);
				}
			}
			if(w) {
				clearInterval(interval);
				resolve(w);
			}
		}, 1);
	});
}

function getFieldByName(o, name) {
	if (o._timelineData) {
		let fields = o._timelineData.f;
		for (let field of fields) {
			if (field.n === name) {
				return field;
			}
		}
	}
}

function getFieldByNameOrCreate(o, name) {
	let field = getFieldByName(o, name);
	if (!field) {
		if (!o._timelineData) {
			o._timelineData = {
				d: 0.85,
				p: 0.02,
				l: {},
				f: []
			};
		}
		field = {
			n: name,
			t: []
		};

		/// #if EDITOR

		field.___timelineData = o._timelineData;
		field.___fieldIndex = o._timelineData.f.length;

		/// #endif

		o._timelineData.f.push(field);
	}
	return field;
}

let getFrameAtTimeOrCreateReturnedNewKeyframe;
function getFrameAtTimeOrCreate(o, name, time) {
	let field = getFieldByNameOrCreate(o, name);
	for (let keyFrame of field.t) {
		if (keyFrame.t === time) {
			getFrameAtTimeOrCreateReturnedNewKeyframe = false;
			return keyFrame;
		}
	}
	getFrameAtTimeOrCreateReturnedNewKeyframe = true;
	return createKeyframe(o, name, time, field);
}


function createKeyframe(o, name, time, field, isAutomaticCreation) {

	let mode;
	let jumpTime = time;
	let prevField = MovieClip._findPreviousKeyframe(field.t, time);
	if (prevField) {
		mode = prevField.m;
		if (mode === 3 || mode === 4) {
			mode = 0;
		}
		if (prevField.j !== prevField.t) { //takes loop point from previous keyframe if it is exists;
			let labelBetweenKeyframes = null;
			for(let lName in o.timeline.l) {
				let lTime = o.timeline.l[lName];
				if(lTime >= prevField.t && lTime <= time) {
					labelBetweenKeyframes = true;
					break;
				}
			}
			if(!labelBetweenKeyframes) {
				jumpTime = prevField.j;
				prevField.j = prevField.t;
			}
		}
	} else {
		mode = getDefaultKeyframeTypeForField([o], name); //Mode 0 - SMOOTH, 1 - LINEAR, 2 - DISCRETE, 3 - BOUNCE ⬇, 4 - BOUNCE ⬆
	}

	let keyFrame = {
		v: o[name], //target Value
		t: time, //frame triggering Time
		m: mode,
		j: jumpTime, //Jump to time. If no jump need - equal to 't'
		___react_id: MovieClip.__generateKeyframeId()
	};

	if(!isAutomaticCreation && (name === 'image') && prevField) {
		let step = time - prevField.t;
		let nextName = increaseNumberInName(prevField.v);
		if((nextName !== prevField.v) && (nextName === o.image)) {
			if(Lib.hasTexture(increaseNumberInName(o.image))) {
				editor.ui.modal.showEditorQuestion("Animation generator", "Do you want to create keyframes for all same images?",
					() => {
						let image = o.image;
						while(true) {// eslint-disable-line no-constant-condition
							image = increaseNumberInName(image);
							if(Lib.hasTexture(image)) {
								time += step;
								o[name] = image;
								createKeyframe(o, name, time, field, true);
							} else {
								break;
							}
						}
						timelineInstance.forceUpdateDebounced();
					}
				);
			}
		}
	}


	field.t.push(keyFrame);
	Timeline.fieldDataChanged(field, o);
	return keyFrame;
}

function increaseNumberInName(v) {
	let regex = /(\d+)(?!.*\d)/gm;
	let a = regex.exec(v);
	if(a) {
		let oldNum = a.pop();
		let newNum = (parseInt(oldNum) + 1).toString();
		while(newNum.length < oldNum.length) {
			newNum =  '0' + newNum;
		}
		a.shift();
		let n = v.lastIndexOf(oldNum);
		return v.substr(0, n) + newNum + v.substr(n + oldNum.length);
	}
	return v;
}

function getDefaultKeyframeTypeForField(o, name) {
	switch (name) {
	case 'x':
	case 'y':
	case 'rotation':
		return 0; //- SMOOTH
	case 'alpha':
	case 'tintR':
	case 'tintG':
	case 'tintB':
		return 1; //- LINEAR
	default:
		return getKeyframeTypesForField(o, name)[0];
	}
}

const keyframeTypesForNumber = [0, 1, 2, 3, 4];
const keyframeTypesDiscreteOnly = [2];

function getKeyframeTypesForField(objects, name) {
	for(let o of objects) {
		let fieldDesc = editor.getObjectField(o, name);
		if(!fieldDesc) {
			setTimeout(() => {
				editor.ui.status.warn("Property '" + name + "' is not exists anymore, but movieClip have animation for it.", 32040, o);
			}, 0);
			return [];
		}
		if (fieldDesc.type !== Number) {
			return keyframeTypesDiscreteOnly;
		}
	}
	return keyframeTypesForNumber;
}

Timeline.getKeyframeTypesForField = getKeyframeTypesForField;

let draggingComponent;
let draggingStartX;
let draggingXShift = 0;
let prevDragTime;

function onDraggableMouseDown(ev) {
	draggingStartX = ev.clientX;
	if (!this.state || !this.state.isSelected) {
		if (!ev.ctrlKey && !ev.shiftKey) {
			clearSelection();
		}
		select(this);
	} else {
		if (!ev.shiftKey && ev.ctrlKey) {
			unselect(this);
		}
	}

	if (ev.altKey) {
		cloneSelectedKeyframes();
	}

	draggingComponent = this;
	let isInvertedShift;
	if(this instanceof TimelineLoopPoint) {
		prevDragTime = this.props.keyFrame.j;
		isInvertedShift = this.props.keyFrame.j > this.props.keyFrame.t;
	} else {
		prevDragTime = (this.props.label || this.props.keyFrame).t;
	}

	let bounds = ev.currentTarget.getBoundingClientRect();
	if(isInvertedShift) {
		draggingXShift = ev.clientX - bounds.x - bounds.width;
	} else {
		draggingXShift = ev.clientX - bounds.x;
	}
}

function cloneSelectedKeyframes() {
	for (let c of selectedComponents) {
		if (c instanceof TimelineKeyframe) {
			c.clone();
		}
	}
}

const sortFieldsByTime = (a, b) => {
	if(a.t !== b.t) {
		return a.t - b.t;
	}
	a = (a.___view && a.___view.state && a.___view.state.isSelected) ? 0 : 1;
	b = (b.___view && b.___view.state && b.___view.state.isSelected) ? 0 : 1;
	return a - b;
};

function onTimelineScroll(ev) {
	selectionFrame.cancelSelection();
	document.querySelector('.objects-timeline-labels').style.left = ev.target.scrollLeft + 'px';
	document.querySelector('.time-marker-body').style.top = ev.target.scrollTop + 'px';
}

let isDragging = false;

function getSelectedKeyframes() {
	let ret = [];
	for (let c of selectedComponents) {
		if (c instanceof TimelineKeyframe) {
			ret.push(c);
		}
	}
	return ret;
}

function reduceRepeatingKeyframesInSelected() {
	let isModified = false;
	for (let keyframeComponent of getSelectedKeyframes()) {
		let timeLineData = keyframeComponent.props.owner.props.owner.props.field.t;
		for (let i = 0; i < timeLineData.length; i++) {
			let kf = timeLineData[i];
			for (let j = i + 1; j < timeLineData.length; j++) {
				let keyFrame = timeLineData[j];
				if ((kf !== keyFrame) && (kf.t === keyFrame.t)) {
					timeLineData.splice(j, 1);
					j--;
					isModified = true;
					Timeline.fieldDataChanged(
						keyframeComponent.props.owner.props.owner.props.field,
						keyframeComponent.props.owner.props.owner.props.owner.props.node
					);
				}
			}
		}
	}
	return isModified;
}

function selectIfInRect(rect, component) {
	selectViewIfInRect(rect, component.___view);
}

function selectViewIfInRect(rect, view) {
	if(view.state && view.state.isSelected) {
		return;
	}
	let domElement = ReactDOM.findDOMNode(view);
	let r = domElement.getBoundingClientRect();
	if(r.right > rect.left && r.left < rect.right) {
		if(r.bottom > rect.top && r.top < rect.bottom) {
			select(view);
		}
	}
}

function selectElementsInRectangle(rect, shiftKey) {
	if(!shiftKey) {
		clearSelection();
	}

	for(let o of editor.selection) {
		if((o instanceof MovieClip) && (o._timelineData)) {
			for(let f of o._timelineData.f) {
				for(let kf of f.t) {
					selectIfInRect(rect, kf);
					if(kf.___loopPointView) {
						selectViewIfInRect(rect, kf.___loopPointView);
					}
				}
			}
			for(let labelName in o._timelineData.l) {
				let label = o._timelineData.l[labelName];
				selectIfInRect(rect, label);
			}
		}
	}

	timelineInstance.onMouseUp({});
	timelineInstance.forceUpdateDebounced();
}
