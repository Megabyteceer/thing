import SceneLinkedPromise from "./scene-linked-promise.js";

/// #if DEBUG
const formats = [
	'json',
	'text',
	'blob',
	'arrayBuffer'
];
/// #endif

export default class SceneLinkedRequest {

	static fetch(owner, url, resultFormat = "json", options) {
		assert(owner, "Request's owner display object should be provided.", 10062);
		assert(url, "Request's URL should be provided.", 10063);
		assert(formats.indexOf(resultFormat) >= 0, "format expected to be one of: " + formats.join(', '), 10064);
		let ret = SceneLinkedPromise.promise((resolve, reject) => {
			fetch(url, options)
				.then((response) => response[resultFormat]()).then(resolve).catch(reject);
		}, owner);
		ret.name = "Request: " + url;
		return ret;
	}
}