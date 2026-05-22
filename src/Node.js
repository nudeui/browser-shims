import { state } from "./state.js";
import { Text } from "./Text.js";

if (!globalThis.Node) {
	class Node extends EventTarget {
		nodeType = 1;
		parentNode = null;
		_children = [];

		get childNodes () {
			return this._children;
		}

		get isConnected () {
			let n = this;
			while (n.parentNode) {
				n = n.parentNode;
			}
			return n === state.doc;
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
				this._children.at(-1).remove();
			}

			if (val !== "" && val != null) {
				this._children.push(new Text(val));
			}
		}

		appendChild (child) {
			this.append(child);
			return child;
		}

		append (...nodes) {
			for (let child of nodes) {
				if (typeof child === "string") {
					child = new Text(child);
				}

				if (child.parentNode) {
					let was = child.parentNode.isConnected ?? false;
					let arr = child.parentNode.childNodes;
					let i = arr.indexOf(child);
					if (i !== -1) {
						arr.splice(i, 1);
					}
					child.parentNode = null;
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
		}

		remove () {
			if (!this.parentNode) {
				return;
			}

			let was = this.isConnected;
			let arr = this.parentNode.childNodes;
			let i = arr.indexOf(this);
			if (i !== -1) {
				arr.splice(i, 1);
			}
			this.parentNode = null;

			if (was) {
				state.onDisconnect(this);
			}
		}
	}

	globalThis.Node = Node;
}

export let { Node } = globalThis;
