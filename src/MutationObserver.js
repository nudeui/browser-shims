if (!globalThis.MutationObserver) {
	class MutationObserver {
		constructor () {}
		observe () {}
		disconnect () {}
	}

	globalThis.MutationObserver = MutationObserver;
}

export let { MutationObserver } = globalThis;
