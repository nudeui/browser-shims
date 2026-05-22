// TODO: implement — no-op stub to prevent ReferenceErrors
export default globalThis.MutationObserver ??= class MutationObserver {
	constructor () {}
	observe () {}
	disconnect () {}
};

export let { MutationObserver } = globalThis;
