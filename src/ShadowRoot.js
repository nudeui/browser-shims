import { Node } from "./Node.js";
import { getInnerHTML, setInnerHTML } from "./html.js";

export default (globalThis.ShadowRoot ??= class ShadowRoot extends Node {
	nodeType = 11;
	adoptedStyleSheets = [];
	// True for a root parsed from <template shadowrootmode>, until attachShadow() reuses it
	_declarative = false;

	constructor (host, mode, slotAssignment) {
		super();
		this.host = host;
		this.mode = mode;
		this.slotAssignment = slotAssignment;
	}

	get isConnected () {
		return this.host.isConnected;
	}

	get nodeName () {
		return "#document-fragment";
	}

	get innerHTML () {
		return getInnerHTML(this);
	}

	set innerHTML (html) {
		setInnerHTML(this, html);
	}

	setHTMLUnsafe (html) {
		setInnerHTML(this, html, { shadowRoots: true });
	}
});

export let { ShadowRoot } = globalThis;
