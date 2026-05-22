if (!globalThis.Text) {
	class Text {
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

		remove () {
			if (!this.parentNode) {
				return;
			}

			let arr = this.parentNode.childNodes;
			let i = arr.indexOf(this);
			if (i !== -1) {
				arr.splice(i, 1);
			}
			this.parentNode = null;
		}
	}

	globalThis.Text = Text;
}

export let { Text } = globalThis;
