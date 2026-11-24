import { Node } from "./Node.js";
import { ShadowRoot } from "./ShadowRoot.js";
import { getInnerHTML, setInnerHTML } from "./html.js";
import { findSlot, updateSlots } from "./slots.js";
import { queueRecord } from "./MutationObserver.js";

export default (globalThis.Element ??= class Element extends Node {
	#attrs = new Map();
	#def = null;
	#shadowRoot = null;

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
		this.#attributeChanged(name);

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
		this.#attributeChanged(name);

		if (this.#def?.observedAttrs?.includes(name) && this.attributeChangedCallback) {
			this.attributeChangedCallback(name, old, null);
		}
	}

	#attributeChanged (name) {
		queueRecord("attributes", this, { attributeName: name });

		// `slot` picks a node's slot, and `name` names a slot
		if (name === "slot" || name === "name") {
			updateSlots(this.parentNode ?? this);
		}
	}

	hasAttribute (name) {
		return this.#attrs.has(name);
	}

	// FIXME: Writes through dataset are silently lost.
	// FIXME: camelCase keys are not converted to dashed names, so dataset.fooBar reads data-fooBar.
	get dataset () {
		return new Proxy({}, { get: (_, key) => this.getAttribute(`data-${key}`) ?? undefined });
	}

	get assignedSlot () {
		return findSlot(this, { open: true });
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
			// TODO: toggle() returns nothing, where native returns whether the class is now present.
			toggle (cls, force = !el.#classSet().has(cls)) {
				let s = el.#classSet();
				if (force) {
					s.add(cls);
				}
				else {
					s.delete(cls);
				}
				el.#setClasses(s);
			},
			contains (cls) {
				return el.#classSet().has(cls);
			},
		};
	}

	// NOTE: Only a compound selector of an optional tag and any of `[attr]`, `[attr="value"]`, `:not([attr])` and `:not([attr="value"])` is supported, and other forms throw.
	matches (sel) {
		let [, tag, rest] =
			sel.match(
				/^([a-z][\w-]*)?((?::not\(\[[^\]=]+(?:="[^"]*")?\]\)|\[[^\]=]+(?:="[^"]*")?\])*)$/i,
			) ?? [];

		if (!sel || rest === undefined) {
			throw new Error(`matches(): unsupported selector "${sel}"`);
		}

		if (tag && this.localName !== tag.toLowerCase()) {
			return false;
		}

		for (let [, not, name, value] of rest.matchAll(/(:not\()?\[([^\]=]+)(?:="([^"]*)")?\]/g)) {
			let found =
				value === undefined ? this.hasAttribute(name) : this.getAttribute(name) === value;
			if (found === Boolean(not)) {
				return false;
			}
		}

		return true;
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

	get shadowRoot () {
		return this.#shadowRoot?.mode === "open" ? this.#shadowRoot : null;
	}

	// DOM spec, "attach a shadow root". Verified in Chromium, Gecko and WebKit.
	attachShadow (init) {
		let mode = init?.mode;
		if (mode !== "open" && mode !== "closed") {
			throw new TypeError(`attachShadow(): "${mode}" is not a valid mode`);
		}

		// FIXME: An invalid slotAssignment is accepted and acts as "named", where native throws a TypeError.
		let slotAssignment = init.slotAssignment ?? "named";

		let root = this.#shadowRoot;
		if (!root) {
			return (this.#shadowRoot = new ShadowRoot(this, mode, slotAssignment));
		}

		// Only a declarative root of the same mode is reused, and only once
		if (!root._declarative || root.mode !== mode) {
			throw new DOMException("The element already has a shadow root", "NotSupportedError");
		}

		root.textContent = "";
		root._declarative = false;
		return root;
	}

	static _setDef (el, def) {
		el.#def = def;
	}

	// For walk(), which enters closed roots too
	static _getShadowRoot (node) {
		return #shadowRoot in node ? node.#shadowRoot : null;
	}
});

export let { Element } = globalThis;
