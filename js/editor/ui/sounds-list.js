import Lib from "thing-editor/js/engine/lib.js";
import Group from "./group.js";
import Sound from "thing-editor/js/engine/utils/sound.js";
import BgMusic from "thing-editor/js/engine/components/bg-music.js";
import game from "thing-editor/js/engine/game.js";
import SelectEditor from "./props-editor/select-editor.js";
import MusicFragment from "thing-editor/js/engine/utils/music-fragment.js";

let sounds = {};

const bodyProps = {className: 'sounds-list list-view'};

let labelProps = {className: 'selectable-text', title: 'Ctrl+click to copy sound`s name', onMouseDown:window.copyTextByClick};
let soundPreloadingModes = [
	{name: '-', value: undefined},
	{name: 'on demand', value: 1},
	{name: 'pre-cache', value: 2}
];
let soundPreloadingModeDescriptions = {
	0: "Sound will be loaded before game start",
	1: "Sound will be loaded on entering scene which own this sound as BGMusic,\nor manually by calling Lib.preloadSound('soundName') in onShow method of scene.",
	2: "Sound will be pre-cached after game start"
};

let bitrates = [48, 64, 80, 96, 112, 128, 160, 192].map((b) => {return {name:b + 'Kb', value: b};});
let bitratesWitDefault = bitrates.slice();
bitratesWitDefault.unshift({name:'..', value:undefined});

const soundNameCleaner = /^snd\//gm;
const supportedSoundFormats = ['webm', 'ogg', 'mp3', 'weba', 'aac'];

export default class SoundsList extends React.Component {

	constructor(props) {
		super(props);
		let filter = editor.settings.getItem('sounds-filter', '');
		this.state = {filter};
		this.searchInputProps = {
			className: 'sounds-search-input',
			onChange: this.onSearchChange.bind(this),
			placeholder: 'Search',
			defaultValue: filter
		};
		this.onSelect = this.onSelect.bind(this);
	}

	onSearchChange(ev) {
		let filter= ev.target.value.toLowerCase();
		editor.settings.setItem('sounds-filter', filter);
		this.setState({filter});
	}

	rebuildSounds(noCacheSoundName) {
		let options = {
			formats: editor.projectDesc.soundFormats,
			noCacheSoundName,
			bitrates: editor.projectDesc.soundBitrates,
			defaultBitrate: editor.projectDesc.soundDefaultBitrate
		};
		return editor.fs.postJSON('/fs/build-sounds', options);
	}

	static chooseSound(title, noEasyClose) {
		let libSounds = Lib.__getSoundsData();
		
		let sounds = [];
		for (let name in libSounds) {
			sounds.push({name});
		}
		return editor.ui.modal.showListChoose(title || "Choose sound", sounds, noEasyClose).then((choosed) => {
			if(choosed) {
				return choosed.name;
			}
			return null;
		});

	}

	afterDeleteSounds() {
		editor.ui.soundsList.reloadSounds(null, true);
	}

	reloadSounds(onlyThisFiles = null, updateFilesForced = false) {
		assert(!this.soundsReloadingInProgress, "Sounds loading already in progress.");
		return new Promise((resolve) => {
			if(editor.projectDesc.soundFormats) {
				for(let f of editor.projectDesc.soundFormats) {
					if(supportedSoundFormats.indexOf(f) < 0) {
						editor.ui.modal.showError('soundFormats has unsupported format entry: ' + f + "; Expected one of: 'webm', 'ogg', 'mp3', 'weba', or 'aac'", 30004);
						editor.openProjectDescToEdit();
						return;
					}
				}
				this.soundsReloadingInProgress = true;
				this.rebuildSounds().then((result) => {
					this.soundsReloadingInProgress = false;
					if(result.errors) {
						editor.ui.modal.showError(R.fragment(R.b(null, 'Make sure ffmpeg library is installed and it is aded to the PATH.'), result.errors.map((r, i) =>{
							return R.div({key:i}, JSON.stringify(r));
						})), 30007, "Sounds processing ffmpeg lib error.");
						resolve();
					} else {

						const reloadSoundsInner = () => {
							const soundFilter =  new RegExp("^snd\/.*\.(" + editor.projectDesc.soundFormats.join('|') + ")$", "gmi");

							sounds = {};
							editor.fs.filesExt.snd.some((fileInfo) => {
								let fileName = fileInfo.name;
								if(fileName.match(soundFilter)) {

									fileName = fileName.replace(soundNameCleaner, '');					
									let name = fileName.split('.');
									name.pop();
									name = name.join('.');
									let wavName = name +'.wav';
									let wavFullName = 'snd/' + name +'.wav';
									if(!editor.fs.filesExt.snd.find((s) => {
										return s.name === wavFullName;
									})) {
										editor.ui.status.warn("Sound file '" + fileInfo.name + "' has no .wav version. Click to delete.", 99999, () => {
											editor.fs.deleteFile(fileInfo.name);
											editor.ui.modal.notify(fileInfo.name + ' deleted.');
											return true;
										});
									} else {
										if(!onlyThisFiles || onlyThisFiles.has(wavName)) {
											if(!sounds.hasOwnProperty(name)) {
												sounds[name] = [];
												if(fileInfo.lib) {
													sounds[name].___libInfo = R.libInfo(fileInfo.lib);
												}
											}
											sounds[name].push(fileName);
										}
									}
								}
							});

							for(let f in sounds) {
								let a = sounds[f];
								a.sort(soundsPriority);
							}
							MusicFragment.__stopAll();
							Lib._setSounds(sounds, !!onlyThisFiles);
							resolve();
							BgMusic._recalculateMusic();
							this.forceUpdate();
						};

						if(result.updated || updateFilesForced) {
							editor.fs.refreshFiles().then(reloadSoundsInner);
						} else {
							reloadSoundsInner();
						}
					}
				});
			} else {
				assert(false, 'no soundFormats option defined', true);
				resolve();
			}
		});
	}
	onSelect(item) {
		this.soundClick(item.name);
	}

	soundClick(name, volume = 1) {
		Lib.preloadSound(name);
		let needPlay = !Lib.getSound(name).playing();
		if(game.__EDITOR_mode) {
			Sound.__stop();
		}
		if(needPlay) {
			Sound.play(name, volume);
		}
	}

	onStopAllClick() {
		Sound.__stop();
	}

	renderItem(sndName, item) {

		let mode = editor.projectDesc.loadOnDemandSounds[sndName] || 0;
		let bitrate = editor.projectDesc.soundBitrates[sndName] || 0;

		return R.listItem(R.span(null, item.___libInfo ? item.___libInfo.icon : undefined, R.icon('sound'), R.b(labelProps, sndName), 
			R.span({className: 'sound-preload-ui', title: soundPreloadingModeDescriptions[mode],
				onMouseDown: (ev) => {
					ev.stopPropagation();
				}},
			React.createElement(SelectEditor, {onChange:(ev) => {
				mode = ev.target.value;
				var opt = editor.projectDesc.loadOnDemandSounds;
				if(!mode) {
					delete opt[sndName];
					Lib.preloadSound(sndName);
				} else {
					opt[sndName] = mode;
				}
				editor.saveProjectDesc();
				this.forceUpdate();
				
			}, noCopyValue:true, value:mode, select: soundPreloadingModes}),
			
			React.createElement(SelectEditor, {onChange:(ev) => {
				bitrate = ev.target.value;
				var opt = editor.projectDesc.soundBitrates;
				if(!bitrate) {
					delete opt[sndName];
				} else {
					opt[sndName] = bitrate;
				}
				editor.saveProjectDesc();
				this.forceUpdate();
				this.rebuildSounds();
			}, noCopyValue:true, value:bitrate, select: bitratesWitDefault})
			
			)
			
		), item, sndName, this);
	}
	
	render() {
		let list = [];
		this.selectedItem = null;
		for (let sndName of Lib.__soundsList) {
			if(!this.state.filter || sndName.name.indexOf(this.state.filter) >= 0) {
				list.push(this.renderItem(sndName.name, sndName));
			}
		}

		if(!this.state.filter) {
			list = Group.groupArray(list);
		}

		return R.fragment(
			R.div({className: 'sounds-list-header'},
				R.btn('Stop all', this.onStopAllClick),
				React.createElement(MusicProfiler),
				editor.projectDesc ? R.span({title: "Default bitrate"}, React.createElement(SelectEditor, {title: 'Default bitrate', onChange:(ev) => {
					editor.projectDesc.soundDefaultBitrate = ev.target.value;
					editor.saveProjectDesc();
					this.forceUpdate();
					editor.ui.modal.showInfo('Bitrate changes will be applied on next assets loading.', undefined, 32041);
				}, noCopyValue:true, value:editor.projectDesc.soundDefaultBitrate, select: bitrates})) : undefined,
				R.input(this.searchInputProps)
			),
			R.div(bodyProps, list)
		);
	}
}

const soundsPriority = (a, b) => {
	return getSndPriority(a) - getSndPriority(b);
};

const getSndPriority = (s) => {
	let i = editor.projectDesc.soundFormats.indexOf(s.split('.').pop().toLowerCase());
	if(i < 0) {
		i = 1000;
	}
	return i;
};


const profilerWrapperProps = {className: 'music-profiler-wrapper'};
const profilerProps = {className: 'music-profiler'};
const activeSoundProps = {style: {fontWeight: 'bold'}};

class MusicProfiler extends React.Component {

	constructor(props) {
		super(props);
		this.state = {};
		this.onToggle = this.onToggle.bind(this);
	}

	componentDidMount() {
		this.interval = setInterval(() => {
			this.forceUpdate();
		}, 20);
	}

	componentWillUnmount() {
		clearInterval(this.interval);
	}

	onToggle() {
		this.setState({toggled: !this.state.toggled});
	}

	renderMusicItem(m, i) {
		let state;
		let playing;
		if(m.__currentFragment) {
			if(!m.__currentFragment.playing()) {
				state = R.div({className:'danger'}, 'ref to not playing fragment');
			} else {
				playing = true;
				state = R.div({className: 'sound-vol-bar-bg'},
					R.div({className: 'sound-vol-bar', style: {width: m.__getVolume() * 100}})
				);
			}
		}
		return R.div({className:'clickable', key:i, onClick:() => {
			if(m.getRootContainer() === game.currentContainer) {
				editor.ui.sceneTree.selectInTree(m);
			} else {
				let root = m.getRootContainer();
				if(!root) {
					root = m;
					while(root.parent) {
						root = root.parent;
					}
				}
				editor.ui.modal.showEditorQuestion(
					'Cant select music object',
					R.div(null, "Container of this music :", R.sceneNode(root))
				);
			}
		}},
		R.span((playing && !m.isLoopPos) ? activeSoundProps : null, m.intro),
		' : ',
		R.span((playing && m.isLoopPos) ? activeSoundProps : null, m.loop),
		state
		);
	}

	render() {
		let list;
		let className;
		if(this.state.toggled) {
			if(game.__EDITOR_mode) {
				list = 'Start game execution to profile music.';
			} else {
				list = BgMusic.__allActiveMusics.map(this.renderMusicItem);
			}
			list = R.div(profilerProps, list);
		} else {
			for(let m of BgMusic.__allActiveMusics) {
				if(m.__currentFragment) {
					if(m.__currentFragment.volume() === 0) {
						className = 'danger';
					}
				}
			}
		}
		return R.span(profilerWrapperProps, 
			R.btn('profiler', this.onToggle, undefined, className),
			list
		);
	}

}

Sound.play.___EDITOR_callbackParameterChooserFunction = () => {
	return SoundsList.chooseSound("Choose sound to play:");
};