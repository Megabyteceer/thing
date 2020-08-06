// this resource loader repeats PIXI.Loader,
// but additionally it is attempts to load resource 4 times

import game from "../game.js";

let loadingResources = [];

export default class ResourceLoader {

	constructor() {
		assert(!game._loadingErrorIsDisplayed, "Attempt to create loader when game loading failed already.", 99999);
		this.loader = new PIXI.Loader();
		this.attempt = 0;
		this.count = 1; // 1 - is loading holder
		this.resources = {};
	}

	add(name, url) {
		this.loader.add(name, url);
		this.resources[name] = true;
		this.count++;
	}

	static getLoadingCount() {
		let ret = 0;
		for(let l of loadingResources) {
			ret += l.count;
		}
		return ret;
	}

	static destroyAllLoaders() {
		for(let l of loadingResources) {
			l.loader.destroy();
		}
	}

	load(cb, isReattempt) {

		if(!isReattempt) {
			loadingResources.push(this);
		}
		
		this.loader.onLoad.add((loader, resource) => {
			if(this.resources[resource.name]) {
				this.count--;
				assert(this.count >= 1, "Resources counting error.");
			}
		});

		let errorResourceResources;

		this.loader.load(() => {
			if(game._loadingErrorIsDisplayed) {
				return;
			}

			for(let res of Object.values(this.loader.resources)) {
				if(res.error) {
					if(!errorResourceResources) {
						errorResourceResources = [];
					}
					if(this.resources[res.name]) {
						errorResourceResources.push(res);
					} else {
						errorResourceResources = errorResourceResources.concat(Object.keys(this.resources).map(k => this.loader.resources[k]));
						break;
					}
				}
			}

			if(errorResourceResources) {
				if(this.attempt++ < 3) {
					setTimeout(() => {
						this.loader = new PIXI.Loader();
						this.count = 1;
						for(let r of errorResourceResources) {
							this.add(r.name, r.url);
						}
						this.load(cb, true);
					}, this.attempt * 1000);
				} else {
					game._onLoadingError(errorResourceResources[0].url);
				}
			} else {
				this.resources = Object.assign(this.resources, this.loader.resources);
				assert(this.count === 1, "Resources count error.");
			
				let i = loadingResources.indexOf(this);
				assert(i >= 0, "Loader's registration corrupted.");
				loadingResources.splice(i, 1);
				if(!game._loadingErrorIsDisplayed) {
					if(cb) {
						cb(this, this.resources);
					}
					if(loadingResources.length === 0 && ResourceLoader.preloader) {
						ResourceLoader.preloader.onComplete();
						ResourceLoader.preloader = null;
					}
				}
			}
		});
	}
}

