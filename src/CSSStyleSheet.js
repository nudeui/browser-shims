// TODO: implement — no-op stub to prevent ReferenceErrors
export default globalThis.CSSStyleSheet ??= class CSSStyleSheet {
	replaceSync () {}
};

export let { CSSStyleSheet } = globalThis;
