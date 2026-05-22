import { state, walk } from "./_shared.js";
import { Element } from "./Element.js";

if (!globalThis.customElements) {
	class CustomElementRegistry {
		#defs = new Map();
		#pending = new Map();

		define (name, Cls) {
			if (!name.includes("-")) {
				throw new DOMException(`"${name}" is not a valid custom element name`);
			}

			if (this.#defs.has(name)) {
				throw new DOMException(`"${name}" has already been defined`);
			}

			let def = {
				name,
				Cls,
				observedAttrs: Cls.observedAttributes ?? [],
			};

			this.#defs.set(name, def);

			if (state.doc?.body) {
				walk(state.doc.body, n => {
					if (n instanceof Element && n.localName === name && !(n instanceof Cls)) {
						upgrade(n, def);
					}
				});
			}

			if (this.#pending.has(name)) {
				for (let resolve of this.#pending.get(name)) {
					resolve(Cls);
				}
				this.#pending.delete(name);
			}
		}

		get (name) {
			return this.#defs.get(name)?.Cls;
		}

		getDef (name) {
			return this.#defs.get(name) ?? null;
		}

		whenDefined (name) {
			let d = this.#defs.get(name);
			if (d) {
				return Promise.resolve(d.Cls);
			}

			return new Promise(resolve => {
				if (!this.#pending.has(name)) {
					this.#pending.set(name, []);
				}
				this.#pending.get(name).push(resolve);
			});
		}
	}

	function upgrade (el, def) {
		Object.setPrototypeOf(el, def.Cls.prototype);
		Element._setDef(el, def);

		let reactions = [];

		for (let attr of el.attributes) {
			if (def.observedAttrs.includes(attr.name)) {
				reactions.push(() => el.attributeChangedCallback?.(attr.name, null, attr.value));
			}
		}

		if (el.isConnected) {
			reactions.push(() => el.connectedCallback?.());
		}

		state._upgrade = el;
		new def.Cls();
		state._upgrade = null;

		for (let fn of reactions) {
			fn();
		}
	}

	globalThis.CustomElementRegistry = CustomElementRegistry;
	globalThis.customElements = new CustomElementRegistry();
}

export let { CustomElementRegistry, customElements } = globalThis;
