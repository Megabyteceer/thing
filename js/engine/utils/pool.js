let pools = new Map();

export default class Pool {
	
	static clearAll() {
		pools.clear();
	}
	
	static create(constructor) {
		if (!pools.has(constructor)) {
			return new constructor();
		}
		let a = pools.get(constructor);
		if (a.length === 0) {
			return new constructor();
		}
		/// #if EDITOR
		let i = Math.floor(Math.random() * a.length);
		let ret = a[i];
		a.splice(i, 1);
		assert(!ret.hasOwnProperty('children') || ret.children.length === 0, "Pool contains DisplayObject with non empty children.", 99999);
		return ret;
		/// #endif

		return a.pop(); // eslint-disable-line no-unreachable
	}
	
	static dispose(obj) {
		let key = obj.constructor;
		if (!pools.has(key)) {
			pools.set(key, []);
		}

		assert(pools.get(key).indexOf(obj) === -1, 'Object already disposed');
	
		pools.get(key).push(obj);
	}
}