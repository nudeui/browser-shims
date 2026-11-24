// Slot assignment, named and manual, as in the DOM spec. Verified in Chromium, Gecko and WebKit.
// Class-free, because Node imports this module before the classes it would need exist.

let signaled = new Set();

// The shadow root a node is in, or null
function getRoot (node) {
	while (node && !(node.nodeType === 11 && node.host)) {
		node = node.parentNode;
	}

	return node ?? null;
}

/**
 * The slot a host child goes to, as the spec's "find a slot" does
 * @param {Node} node
 * @param {{ open?: boolean }} [options] Whether a closed root hides its slots, as for `assignedSlot`
 * @returns {HTMLSlotElement | null}
 */
export function findSlot (node, { open = false } = {}) {
	let root = node.parentNode && globalThis.Element._getShadowRoot(node.parentNode);

	if (!root || (open && root.mode !== "open")) {
		return null;
	}

	let slots = root.querySelectorAll("slot");
	if (root.slotAssignment === "manual") {
		return slots.find(slot => slot === node._manualSlot) ?? null;
	}

	return slots.find(slot => slot.name === (node.slot ?? "")) ?? null;
}

/**
 * The host children a slot gets. Text has no `slot` attribute, so it goes to the default slot.
 * @param {HTMLSlotElement} slot
 * @returns {Node[]}
 */
// FIXME: The parser turns a comment into an element, so a comment in a host is assigned to the default slot.
export function assignedNodes (slot) {
	let root = getRoot(slot);

	if (!root) {
		return [];
	}

	// Manual slots keep their assignment order, and nodes outside the host wait until they join it
	if (root.slotAssignment === "manual") {
		return (slot._manual ?? []).filter(node => node.parentNode === root.host);
	}

	return root.host.childNodes.filter(node => findSlot(node) === slot);
}

/**
 * `slot.assign()`. A node leaves any slot it was assigned to before.
 * @param {HTMLSlotElement} slot
 * @param {Node[]} nodes
 */
export function assign (slot, nodes) {
	// FIXME: Nodes other than elements and text are accepted, where native throws a TypeError.
	let losers = nodes.map(node => node._manualSlot).filter(Boolean);

	for (let node of slot._manual ?? []) {
		node._manualSlot = null;
	}

	for (let node of nodes) {
		if (node._manualSlot && node._manualSlot !== slot) {
			node._manualSlot._manual = node._manualSlot._manual.filter(n => n !== node);
		}

		node._manualSlot = slot;
	}

	slot._manual = [...new Set(nodes)];

	// The slots a node left can be in another root
	for (let s of new Set([slot, ...losers])) {
		updateSlots(s);
	}
}

/**
 * Re-check the slots a change can reach, and signal each whose assigned nodes changed.
 * @param {Node} node A node whose children or attributes changed
 */
// FIXME: A slot that leaves its root keeps its old assigned nodes, so putting it back can miss or add a slotchange.
// TODO: Adding fallback content to a slot with no assigned nodes fires no slotchange.
export function updateSlots (node) {
	// A host's children go to its own root's slots. A node inside a shadow tree can move nodes between that root's slots.
	for (let root of [globalThis.Element._getShadowRoot(node), getRoot(node)]) {
		for (let slot of root?.querySelectorAll("slot") ?? []) {
			let nodes = assignedNodes(slot);
			let old = slot._assigned ?? [];

			if (nodes.length !== old.length || nodes.some((n, i) => n !== old[i])) {
				slot._assigned = nodes;
				signal(slot);
			}
		}
	}
}

// One slotchange per slot, in a microtask, as the spec's "signal a slot change" does
function signal (slot) {
	if (!signaled.size) {
		queueMicrotask(() => {
			let slots = [...signaled];
			signaled.clear();

			for (let s of slots) {
				let event = new Event("slotchange", { bubbles: true });

				// Native EventTarget knows no tree, so the event walks up to the shadow root here.
				// Listeners on the way still see the slot as the target.
				Object.defineProperty(event, "target", { value: s });

				let node = s;
				while (node && !event.cancelBubble) {
					node.dispatchEvent(event);
					node = node.nodeType === 11 ? null : node.parentNode;
				}
			}
		});
	}

	signaled.add(slot);
}
