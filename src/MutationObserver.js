// NOTE: A patch, not the full DOM spec. It delivers childList and attributes records, in a microtask after the change.
// TODO: Records carry only type, target, attributeName, addedNodes, removedNodes and oldValue.
// TODO: oldValue is always null.
// TODO: characterData, attributeOldValue and the attributeFilter-implies-attributes rule are not supported.
// TODO: Nodes removed from an observed subtree are not followed.
// FIXME: Setting textContent gives one record per removed or added node, where native gives one record for all of them.
// FIXME: slotchange may fire before observer callbacks, where native fires it after them.
// FIXME: Each observer gets its own microtask, so other microtasks can run between two callbacks.
// FIXME: append() queues its record after the connectedCallbacks run, so their records come first.

let registrations = new WeakMap();

/**
 * Queue a record for every observer of the target or, with `subtree`, of an ancestor
 * @param {"childList" | "attributes"} type
 * @param {Node} target
 * @param {{ attributeName?: string, addedNodes?: Node[], removedNodes?: Node[] }} change
 */
export function queueRecord (type, target, { attributeName, addedNodes = [], removedNodes = [] }) {
	let interested = new Set();

	for (let node = target; node; node = node.parentNode) {
		for (let [observer, options] of registrations.get(node) ?? []) {
			if (
				(node === target || options.subtree) &&
				options[type] &&
				(type === "childList" || options.attributeFilter?.includes(attributeName) !== false)
			) {
				interested.add(observer);
			}
		}
	}

	for (let observer of interested) {
		if (!observer._records.length) {
			queueMicrotask(() => {
				let records = observer._records;
				observer._records = [];
				if (records.length) {
					observer._callback.call(observer, records, observer);
				}
			});
		}

		observer._records.push({
			type,
			target,
			attributeName: attributeName ?? null,
			addedNodes,
			removedNodes,
			oldValue: null,
		});
	}
}

export default (globalThis.MutationObserver ??= class MutationObserver {
	_records = [];
	#targets = new Set();

	constructor (callback) {
		this._callback = callback;
	}

	// Observing a target again replaces its options, as natively
	observe (target, options = {}) {
		// The shim's Text does not extend Node, so this checks nodeType
		if (!target?.nodeType) {
			throw new TypeError("observe(): target is not a Node");
		}

		// Natively a TypeError too
		if (!options.childList && !options.attributes) {
			throw new TypeError("observe(): childList or attributes must be true");
		}

		if (!registrations.has(target)) {
			registrations.set(target, new Map());
		}
		registrations.get(target).set(this, options);
		this.#targets.add(target);
	}

	disconnect () {
		for (let target of this.#targets) {
			registrations.get(target).delete(this);
		}

		this.#targets.clear();
		this._records = [];
	}
});

export let { MutationObserver } = globalThis;
