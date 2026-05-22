import { state } from "./state.js";
import { Text } from "./Text.js";
import { Node } from "./Node.js";

let parseFragment;
if (!globalThis.Element) {
	({ parseFragment } = await import("parse5"));
}

function toNode (ast) {
	if (ast.nodeName === "#text") {
		return new Text(ast.value);
	}

	let el = state.doc.createElement(ast.tagName);

	for (let attr of ast.attrs ?? []) {
		el.setAttribute(attr.name, attr.value);
	}

	for (let child of ast.childNodes ?? []) {
		let node = toNode(child);
		node.parentNode = el;
		el.childNodes.push(node);
	}

	return el;
}

export default globalThis.Element ??= class Element extends Node {
	#attrs = new Map();
	#def = null;

	constructor (tag) {
		super();
		this.localName = tag;
	}

	get tagName () {
		return this.localName.toUpperCase();
	}

	get nodeName () {
		return this.tagName;
	}

	get id () {
		return this.getAttribute("id") ?? "";
	}

	set id (val) {
		this.setAttribute("id", val);
	}

	get className () {
		return this.getAttribute("class") ?? "";
	}

	set className (val) {
		this.setAttribute("class", val);
	}

	get slot () {
		return this.getAttribute("slot") ?? "";
	}

	set slot (val) {
		this.setAttribute("slot", val);
	}

	get attributes () {
		return [...this.#attrs.entries()].map(([name, value]) => ({ name, value }));
	}

	getAttribute (name) {
		return this.#attrs.get(name) ?? null;
	}

	setAttribute (name, val) {
		let old = this.#attrs.get(name) ?? null;
		this.#attrs.set(name, String(val));

		if (this.#def?.observedAttrs?.includes(name) && this.attributeChangedCallback) {
			this.attributeChangedCallback(name, old, String(val));
		}
	}

	removeAttribute (name) {
		let old = this.#attrs.get(name) ?? null;
		if (old === null) {
			return;
		}

		this.#attrs.delete(name);

		if (this.#def?.observedAttrs?.includes(name) && this.attributeChangedCallback) {
			this.attributeChangedCallback(name, old, null);
		}
	}

	hasAttribute (name) {
		return this.#attrs.has(name);
	}

	get children () {
		return this.childNodes.filter(c => c instanceof Element);
	}

	get firstElementChild () {
		return this.children[0] ?? null;
	}

	#classSet () {
		return new Set((this.className || "").split(/\s+/).filter(Boolean));
	}

	#setClasses (set) {
		this.className = [...set].join(" ");
	}

	get classList () {
		let el = this;
		return {
			add (cls) {
				let s = el.#classSet();
				s.add(cls);
				el.#setClasses(s);
			},
			remove (cls) {
				let s = el.#classSet();
				s.delete(cls);
				el.#setClasses(s);
			},
			toggle (cls) {
				let s = el.#classSet();
				if (s.has(cls)) {
					s.delete(cls);
				}
				else {
					s.add(cls);
				}
				el.#setClasses(s);
			},
			contains (cls) {
				return el.#classSet().has(cls);
			},
		};
	}

	matches (sel) {
		if (/^[a-z][\w-]*$/i.test(sel)) {
			return this.localName === sel.toLowerCase();
		}

		let m = sel.match(/^\[([^\]=]+)\]$/);
		if (m) {
			return this.hasAttribute(m[1]);
		}

		m = sel.match(/^\[([^\]=]+)="([^"]*)"\]$/);
		if (m) {
			return this.getAttribute(m[1]) === m[2];
		}

		throw new Error(`matches(): unsupported selector "${sel}"`);
	}

	// Verified in Chromium: new children connect first, old disconnect after
	set innerHTML (html) {
		let frag = parseFragment(html);
		let nodes = frag.childNodes.map(n => toNode(n));

		let old = [...this.childNodes];
		let connected = this.isConnected;

		for (let child of nodes) {
			child.parentNode = this;
			this.childNodes.push(child);
			if (connected) {
				state.onConnect(child);
			}
		}

		for (let child of old) {
			let i = this.childNodes.indexOf(child);
			if (i !== -1) {
				this.childNodes.splice(i, 1);
			}
			child.parentNode = null;
			if (connected) {
				state.onDisconnect(child);
			}
		}
	}

	static _setDef (el, def) {
		el.#def = def;
	}
};

export let { Element } = globalThis;
