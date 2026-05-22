# browser-shim

Functional stubs for DOM objects needed for web component testing, using all built-in objects the environment has rather than replacing them.

This came out of our need to programmatically test our Web Components plugins but all available shims we tried (`jsdom`, `happy-dom`, even `@lit-labs/ssr-dom-shim`) either replaced the built-in objects that NodeJS *did* have (`Event`, `EventTarget`, `CustomEvent` etc) or were completely non-functional stubs.
