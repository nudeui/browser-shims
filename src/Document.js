import { state } from "./state.js";
import { walk } from "./util.js";
import { Node } from "./Node.js";
import { Element } from "./Element.js";
import { HTMLElement } from "./HTMLElement.js";

if (!globalThis.document) {
	class Document extends Node {
		nodeType = 9;

		constructor () {
			super();
			this.body = new Element("body");
			this.body.parentNode = this;
		}

		get nodeName () {
			return "#document";
		}

		createElement (tag) {
			tag = tag.toLowerCase();
			let def = globalThis.customElements.getDef(tag);

			if (def) {
				HTMLElement._tag = tag;
				HTMLElement._def = def;
				let el = new def.Cls();
				HTMLElement._tag = null;
				HTMLElement._def = null;
				return el;
			}

			return new HTMLElement(tag);
		}

		createDocumentFragment () {
			let frag = new Node();
			frag.nodeType = 11;
			return frag;
		}
	}

	state.doc = new Document();
	globalThis.document = state.doc;

	state.onConnect = function (node) {
		walk(node, n => {
			if (n instanceof Element) {
				n.connectedCallback?.();
			}
		});
	};

	state.onDisconnect = function (node) {
		walk(node, n => {
			if (n instanceof Element) {
				n.disconnectedCallback?.();
			}
		});
	};
}

export let { document } = globalThis;
