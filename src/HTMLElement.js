import { state } from "./_shared.js";
import { Element } from "./Element.js";

if (!globalThis.HTMLElement) {
	class HTMLElement extends Element {
		static _tag = null;
		static _def = null;

		constructor (tag) {
			if (state._upgrade) {
				super(state._upgrade.localName);
				return state._upgrade;
			}

			super(tag ?? HTMLElement._tag);

			if (HTMLElement._def) {
				Element._setDef(this, HTMLElement._def);
			}
		}

		attachShadow (opts = {}) {
			return { mode: opts.mode, adoptedStyleSheets: [] };
		}
	}

	globalThis.HTMLElement = HTMLElement;
}

export let { HTMLElement } = globalThis;
