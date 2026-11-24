import { state } from "./state.js";
import { Text } from "./Text.js";
import { updateSlots } from "./slots.js";
import { queueRecord } from "./MutationObserver.js";

let parseFragment, serialize, defaultTreeAdapter;
if (!globalThis.Element) {
	({ parseFragment, serialize, defaultTreeAdapter } = await import("parse5"));
}

// Lets the parse5 serializer read shim nodes
let treeAdapter = {
	...defaultTreeAdapter,
	isElementNode: node => node.nodeType === 1,
	getTagName: el => el.localName,
	getNamespaceURI: () => "http://www.w3.org/1999/xhtml",
	getAttrList: el => el.attributes,
	getTextNodeContent: node => node.data,
	// Shim templates have no `content`. Their children stand in for it.
	getTemplateContent: el => el,
};

function getShadowRootMode (ast) {
	let mode =
		ast.tagName === "template" &&
		ast.attrs.find(attr => attr.name === "shadowrootmode")?.value.toLowerCase();
	return mode === "open" || mode === "closed" ? mode : null;
}

function toNode (ast, shadowRoots) {
	if (ast.nodeName === "#text") {
		return new Text(ast.value);
	}

	// Parsed elements start undefined. setInnerHTML() upgrades them, so a constructor sees the whole tree.
	let el =
		ast.tagName === "slot"
			? new globalThis.HTMLSlotElement()
			: new globalThis.HTMLElement(ast.tagName);

	for (let attr of ast.attrs ?? []) {
		el.setAttribute(attr.name, attr.value);
	}

	let root = null;
	for (let child of ast.childNodes ?? []) {
		// The first <template shadowrootmode> becomes the shadow root of its parent
		let mode = shadowRoots && !root && getShadowRootMode(child);
		if (mode) {
			root = el.attachShadow({ mode });
			root._declarative = true;
			root.append(...child.content.childNodes.map(n => toNode(n, shadowRoots)));
			continue;
		}

		el.append(toNode(child, shadowRoots));
	}

	return el;
}

/**
 * The markup of a node's children, as `innerHTML` returns it
 * @param {Node} node
 * @returns {string}
 */
export function getInnerHTML (node) {
	return serialize(node, { treeAdapter });
}

/**
 * Replace a node's children with parsed markup
 * @param {Node} node
 * @param {string} html
 * @param {{ shadowRoots?: boolean }} [options] Whether `<template shadowrootmode>` attaches a shadow root, as in `setHTMLUnsafe()`
 */
export function setInnerHTML (node, html, { shadowRoots = false } = {}) {
	let nodes = parseFragment(html).childNodes.map(n => toNode(n, shadowRoots));

	let connected = node.isConnected;
	let old = node.childNodes.splice(0, Infinity, ...nodes);

	for (let child of old) {
		child.parentNode = null;
	}

	for (let child of nodes) {
		child.parentNode = node;
	}

	if (old.length || nodes.length) {
		queueRecord("childList", node, { addedNodes: nodes, removedNodes: old });
	}

	updateSlots(node);

	// New elements upgrade and connect before the old ones disconnect, as in Chromium and WebKit.
	// Gecko disconnects first.
	for (let child of nodes) {
		globalThis.customElements.upgrade(child);
	}

	if (connected) {
		for (let child of old) {
			state.onDisconnect(child);
		}
	}
}
