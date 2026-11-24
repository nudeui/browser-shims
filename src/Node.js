import { state } from "./state.js";
import { Text } from "./Text.js";
import { updateSlots } from "./slots.js";
import { queueRecord } from "./MutationObserver.js";

export default (globalThis.Node ??= class Node extends EventTarget {
	static ELEMENT_NODE = 1;
	static DOCUMENT_NODE = 9;

	nodeType = 1;
	parentNode = null;
	_children = [];

	get childNodes () {
		return this._children;
	}

	get isConnected () {
		return this.parentNode ? this.parentNode.isConnected : this === state.doc;
	}

	get firstChild () {
		return this._children[0] ?? null;
	}

	get nodeName () {
		return "";
	}

	get textContent () {
		return this._children.map(c => c.textContent).join("");
	}

	set textContent (val) {
		while (this._children.length) {
			this._children[0].remove();
		}

		if (val !== "" && val != null) {
			// Not this.append(), which a component may override
			Node.prototype.append.call(this, String(val));
		}
	}

	// FIXME: `{ composed: true }` is ignored, so a node in a shadow tree gets its shadow root, where native goes on through the host.
	getRootNode () {
		let node = this;
		while (node.parentNode) {
			node = node.parentNode;
		}

		return node;
	}

	appendChild (child) {
		this.append(child);
		return child;
	}

	append (...nodes) {
		nodes = nodes.map(child => (typeof child === "string" ? new Text(child) : child));

		for (let child of nodes) {
			if (child.parentNode) {
				let was = child.parentNode.isConnected ?? false;
				let arr = child.parentNode.childNodes;
				let i = arr.indexOf(child);
				if (i !== -1) {
					arr.splice(i, 1);
				}
				let old = child.parentNode;
				child.parentNode = null;
				queueRecord("childList", old, { removedNodes: [child] });
				updateSlots(old);
				if (was) {
					state.onDisconnect(child);
				}
			}

			child.parentNode = this;
			this._children.push(child);

			if (this.isConnected) {
				state.onConnect(child);
			}
		}

		// One record for all the nodes, as native append() inserts them as one fragment
		if (nodes.length) {
			queueRecord("childList", this, { addedNodes: nodes });
			updateSlots(this);
		}
	}

	remove () {
		if (!this.parentNode) {
			return;
		}

		let was = this.isConnected;
		let parent = this.parentNode;
		let arr = parent.childNodes;
		let i = arr.indexOf(this);
		if (i !== -1) {
			arr.splice(i, 1);
		}
		this.parentNode = null;
		queueRecord("childList", parent, { removedNodes: [this] });
		updateSlots(parent);

		if (was) {
			state.onDisconnect(this);
		}
	}

	// Descendants in tree order. A nested shadow root is not a child, so it stays out.
	// NOTE: Each comma-separated part is a compound selector for matches(), optionally after `:scope >`, and no other combinator is supported.
	querySelectorAll (sel) {
		let parts = sel.split(",").map(part => part.trim().match(/^(:scope\s*>\s*)?(.+)$/));
		let descendants = nodes =>
			nodes
				.filter(node => node.nodeType === 1)
				.flatMap(el => [el, ...descendants(el.childNodes)]);

		return descendants(this.childNodes).filter(el =>
			parts.some(
				([, child, compound]) => (!child || el.parentNode === this) && el.matches(compound),
			));
	}

	querySelector (sel) {
		return this.querySelectorAll(sel)[0] ?? null;
	}
});

export let { Node } = globalThis;
