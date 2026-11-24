import { findSlot, updateSlots } from "./slots.js";
import { queueRecord } from "./MutationObserver.js";

export default (globalThis.Text ??= class Text {
	nodeType = 3;
	parentNode = null;

	constructor (data = "") {
		this.data = data;
	}

	get textContent () {
		return this.data;
	}

	set textContent (val) {
		this.data = val;
	}

	get nodeName () {
		return "#text";
	}

	get assignedSlot () {
		return findSlot(this, { open: true });
	}

	remove () {
		if (!this.parentNode) {
			return;
		}

		let parent = this.parentNode;
		let arr = parent.childNodes;
		let i = arr.indexOf(this);
		if (i !== -1) {
			arr.splice(i, 1);
		}
		this.parentNode = null;
		queueRecord("childList", parent, { removedNodes: [this] });
		updateSlots(parent);
	}
});

export let { Text } = globalThis;
