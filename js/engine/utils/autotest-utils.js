import getValueByPath from "./get-value-by-path.js";
import Button from "../components/button.js";
import ws from "thing-editor/js/editor/utils/socket.js";
import game from "../game.js";
import SceneLinkedPromise from "../components/scene-linked-promise.js";

let timeoutHandler;
let testsStoppedByUser;

function startTimeout(stepName, timeout) {
	testLog('auto-test step > ' + stepName);
	assert(!timeoutHandler, "Previous auto-test step was not finished.");
	timeoutHandler = setTimeout(() => {
		throw new Error("Auto-test step fail by timeout: " + stepName + `
		staged objects: ${game.stage.children.map((o) => {
		return o.___info;
	}).join('\n')
}
		Promises: ${game.stage.findChildrenByType(SceneLinkedPromise).map(p => p.name).join(', ')}
		`);
	}, timeout);
}

function finishTimeout() {
	clearTimeout(timeoutHandler);
	timeoutHandler = null;
}

export function _stopTests() {
	finishTimeout();
	game.__EDITOR_isAutotestInProgress = false;
	testsStoppedByUser = true;
}

export function _onTestsStart() {
	testsStoppedByUser = false;
}

export function testLog(txt) {
	console.log(txt);
	ws.log(txt);
}

export function testWait(name, condition, timeout = 20000) {
	assert(condition, "No condition parameter provided in to testWait.");
	return new Promise((resolve) => {
		startTimeout(name, timeout);
		const attempt = () => {
			if(!testsStoppedByUser) {
				if(typeof condition === 'function' ? condition() : getValueByPath(condition, {})) {
					finishTimeout();
					resolve();
				} else {
					setTimeout(attempt, 100);
				}
			} else {
				finishTimeout();
			}
		};
		setTimeout(attempt, 100);
	});
}

export function testClickBtn(btnPath, timeout = 20000) {
	return new Promise(async(resolve) => {
		await testWait("Attempt to click button: " + btnPath, () => {
			let b = getValueByPath(btnPath, {});
			return (b instanceof Button) && b.isCanBePressed;
		}, timeout);
		getValueByPath(btnPath, {}).callClick();
		resolve();
	});
}