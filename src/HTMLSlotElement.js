import { HTMLElement } from "./HTMLElement.js";
import { assign, assignedNodes } from "./slots.js";

export default (globalThis.HTMLSlotElement ??= class HTMLSlotElement extends HTMLElement {
	constructor () {
		super("slot");
	}

	get name () {
		return this.getAttribute("name") ?? "";
	}

	assign (...nodes) {
		assign(this, nodes);
	}

	assignedNodes () {
		return assignedNodes(this);
	}
});

export let { HTMLSlotElement } = globalThis;
