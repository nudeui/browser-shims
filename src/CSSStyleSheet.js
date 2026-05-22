if (!globalThis.CSSStyleSheet) {
	class CSSStyleSheet {
		replaceSync () {}
	}

	globalThis.CSSStyleSheet = CSSStyleSheet;
}

export let { CSSStyleSheet } = globalThis;
