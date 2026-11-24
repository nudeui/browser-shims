import { state } from "./state.js";
import { Element } from "./Element.js";

export default (globalThis.HTMLElement ??= class HTMLElement extends Element {
	static _tag = null;
	static _def = null;

	constructor (tag) {
		// Cleared before the constructor body runs, so its own markup creates new elements
		let el = state._upgrade;
		if (el) {
			state._upgrade = null;
			super(el.localName);
			return el;
		}

		super(tag ?? HTMLElement._tag);

		if (HTMLElement._def) {
			Element._setDef(this, HTMLElement._def);
		}
	}
});

export let { HTMLElement } = globalThis;
