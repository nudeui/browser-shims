export let state = { doc: null, _upgrade: null, onConnect () {}, onDisconnect () {} };

export function walk (node, fn) {
	fn(node);
	if (node.childNodes) {
		for (let child of node.childNodes) {
			walk(child, fn);
		}
	}
}
