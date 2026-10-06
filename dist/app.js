(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // src/lib/react-shim.js
  var React;
  var init_react_shim = __esm({
    "src/lib/react-shim.js"() {
      React = window.React;
    }
  });

  // globals:react-dom/client
  var require_client = __commonJS({
    "globals:react-dom/client"(exports, module) {
      init_react_shim();
      module.exports = window.ReactDOM;
    }
  });

  // src/main.jsx
  init_react_shim();
  var import_client = __toESM(require_client());
  var { Button, Badge, Card } = window.Springboard20DesignSystem_019e02;
  function Smoke() {
    return /* @__PURE__ */ React.createElement("div", { style: { padding: 32, display: "flex", gap: 16, alignItems: "center" } }, /* @__PURE__ */ React.createElement(Button, null, "Review contract"), /* @__PURE__ */ React.createElement(Badge, null, "Smoke test"), /* @__PURE__ */ React.createElement("i", { className: "fa-solid fa-house", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement(Card, { style: { padding: 16 } }, "Card surface"));
  }
  (0, import_client.createRoot)(document.getElementById("root")).render(/* @__PURE__ */ React.createElement(Smoke, null));
})();
//# sourceMappingURL=app.js.map
