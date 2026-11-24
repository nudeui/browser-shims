import { Element } from "./Element.js";

// Visits a node, then its shadow root, then its children, in shadow-including tree order
function* nodes (node) {
	yield node;
	let root = Element._getShadowRoot(node);
	if (root) {
		yield* nodes(root);
	}
	for (let child of node.childNodes ?? []) {
		yield* nodes(child);
	}
}

// Collects the nodes before any callback runs, as the DOM spec does. A callback can change the tree.
export function walk (node, fn) {
	for (let n of [...nodes(node)]) {
		fn(n);
	}
}
