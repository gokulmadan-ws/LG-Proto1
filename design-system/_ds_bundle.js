/* @ds-bundle: {"format":4,"namespace":"Springboard20DesignSystem_019e02","components":[{"name":"Accordion","sourcePath":"components/Accordion.jsx"},{"name":"Alert","sourcePath":"components/Alert.jsx"},{"name":"Avatar","sourcePath":"components/Avatar.jsx"},{"name":"Badge","sourcePath":"components/Badge.jsx"},{"name":"Breadcrumb","sourcePath":"components/Breadcrumb.jsx"},{"name":"Button","sourcePath":"components/Button.jsx"},{"name":"Card","sourcePath":"components/Card.jsx"},{"name":"Checkbox","sourcePath":"components/Checkbox.jsx"},{"name":"Input","sourcePath":"components/Input.jsx"},{"name":"Progress","sourcePath":"components/Progress.jsx"},{"name":"Radio","sourcePath":"components/Radio.jsx"},{"name":"Select","sourcePath":"components/Select.jsx"},{"name":"Skeleton","sourcePath":"components/Skeleton.jsx"},{"name":"Spinner","sourcePath":"components/Spinner.jsx"},{"name":"Switch","sourcePath":"components/Switch.jsx"},{"name":"Tabs","sourcePath":"components/Tabs.jsx"},{"name":"Textarea","sourcePath":"components/Textarea.jsx"},{"name":"Toast","sourcePath":"components/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/Tooltip.jsx"}],"sourceHashes":{"components/Accordion.jsx":"de4cbf8e00d3","components/Alert.jsx":"72d91c1183b3","components/Avatar.jsx":"fed5f90ccc06","components/Badge.jsx":"6bec5996a061","components/Breadcrumb.jsx":"1f5bf78d466d","components/Button.jsx":"d4905de05cff","components/Card.jsx":"9ab175533027","components/Checkbox.jsx":"a190c485d6f9","components/Input.jsx":"775021726eb3","components/Progress.jsx":"48ea6918448d","components/Radio.jsx":"d4ddca832ded","components/Select.jsx":"86013d992a43","components/Skeleton.jsx":"bdb28757860d","components/Spinner.jsx":"09f0c422f9df","components/Switch.jsx":"8137605ad5d9","components/Tabs.jsx":"59bbb0952a07","components/Textarea.jsx":"60453cc3a4ed","components/Toast.jsx":"4894a9be9eef","components/Tooltip.jsx":"76fe2ba040d6","ui_kits/springboard/App.jsx":"97146fc44dfb","ui_kits/springboard/Dashboard.jsx":"f66c4f6de4f4","ui_kits/springboard/Header.jsx":"bcb890e819ea","ui_kits/springboard/Library.jsx":"a47eecf8fc42","ui_kits/springboard/Login.jsx":"55d44325ec79","ui_kits/springboard/Sidebar.jsx":"f33c7adfcce0","ui_kits/springboard/Templates.jsx":"39f762b3479b","ui_kits/springboard/ui.jsx":"a31570224215"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.Springboard20DesignSystem_019e02 = window.Springboard20DesignSystem_019e02 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/Accordion.jsx
try { (() => {
// Accordion — self-managing. Single open by default; allowMultiple optional.
function Accordion({
  items = [],
  allowMultiple = false,
  defaultOpen = [],
  className,
  style
}) {
  const [open, setOpen] = React.useState(() => new Set(defaultOpen));
  const toggle = i => setOpen(prev => {
    const next = new Set(allowMultiple ? prev : []);
    if (prev.has(i)) next.delete(i);else next.add(i);
    return next;
  });
  return /*#__PURE__*/React.createElement("div", {
    className: className,
    style: {
      border: "1px solid var(--border-1)",
      borderRadius: "var(--radius-lg)",
      overflow: "hidden",
      ...style
    }
  }, items.map((it, i) => {
    const isOpen = open.has(i);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        borderTop: i ? "1px solid var(--border-1)" : "none"
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => toggle(i),
      "aria-expanded": isOpen,
      style: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "13px 14px",
        border: "none",
        background: "var(--bg-1)",
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
        fontWeight: 500,
        fontSize: 14,
        color: "var(--fg-1)",
        textAlign: "left"
      }
    }, it.title, /*#__PURE__*/React.createElement("i", {
      className: "fa-solid fa-chevron-down",
      style: {
        fontSize: 12,
        color: "var(--fg-3)",
        transition: "transform .2s ease",
        transform: isOpen ? "rotate(180deg)" : "none"
      }
    })), isOpen && /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "0 14px 14px",
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        lineHeight: 1.5,
        color: "var(--fg-2)"
      }
    }, it.content));
  }));
}
Object.assign(__ds_scope, { Accordion, __ds_default_components_Accordion_tqt230: Accordion });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Accordion.jsx", error: String((e && e.message) || e) }); }

// components/Alert.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Alert — inline banner. info / success / warning / error.
function Alert({
  type = "info",
  title,
  dismissible = false,
  onDismiss,
  children,
  className,
  style,
  ...rest
}) {
  const [show, setShow] = React.useState(true);
  const MAP = {
    info: {
      c: "var(--accent)",
      icon: "circle-info"
    },
    success: {
      c: "var(--success)",
      icon: "circle-check"
    },
    warning: {
      c: "var(--warning)",
      icon: "triangle-exclamation"
    },
    error: {
      c: "var(--danger)",
      icon: "circle-exclamation"
    }
  }[type] || {};
  if (!show) return null;
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "alert",
    className: className,
    style: {
      display: "flex",
      gap: 12,
      padding: "12px 14px",
      borderRadius: "var(--radius-lg)",
      background: "color-mix(in srgb, " + MAP.c + " 12%, var(--bg-1))",
      border: "1px solid color-mix(in srgb, " + MAP.c + " 35%, transparent)",
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-" + MAP.icon,
    style: {
      color: MAP.c,
      fontSize: 15,
      marginTop: 1,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      color: "var(--fg-1)",
      marginBottom: children ? 2 : 0
    }
  }, title), children && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      lineHeight: 1.5,
      color: "var(--fg-2)"
    }
  }, children)), dismissible && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShow(false);
      onDismiss && onDismiss();
    },
    "aria-label": "Dismiss",
    style: {
      border: "none",
      background: "transparent",
      color: "var(--fg-3)",
      cursor: "pointer",
      padding: 0,
      fontSize: 14,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-xmark"
  })));
}
Object.assign(__ds_scope, { Alert, __ds_default_components_Alert_xa50wi: Alert });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Alert.jsx", error: String((e && e.message) || e) }); }

// components/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Avatar — image or initials, with optional status dot.
function Avatar({
  src,
  initials,
  size = 32,
  shape = "circle",
  status,
  className,
  style,
  ...rest
}) {
  const radius = shape === "circle" ? "var(--radius-pill)" : "var(--radius-md)";
  const dotColors = {
    online: "var(--success)",
    away: "var(--warning)",
    busy: "var(--danger)",
    offline: "var(--fg-3)"
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    className: className,
    style: {
      position: "relative",
      display: "inline-flex",
      flexShrink: 0,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: size,
      height: size,
      borderRadius: radius,
      overflow: "hidden",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg-3)",
      color: "var(--fg-1)",
      fontFamily: "var(--font-sans)",
      fontWeight: 600,
      fontSize: size <= 24 ? 10 : size <= 36 ? 12 : Math.round(size * 0.38)
    }
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: "",
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }) : initials || ""), status && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      right: -1,
      bottom: -1,
      width: Math.max(8, size * 0.28),
      height: Math.max(8, size * 0.28),
      borderRadius: "var(--radius-pill)",
      background: dotColors[status],
      border: "2px solid var(--bg-1)"
    }
  }));
}
Object.assign(__ds_scope, { Avatar, __ds_default_components_Avatar_x0w55l: Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Badge — status pills & tags. Soft / solid / outline tones.
function Badge({
  tone = "neutral",
  variant = "soft",
  size = "md",
  dot = false,
  leftIcon,
  onRemove,
  children,
  className,
  style,
  ...rest
}) {
  const TONES = {
    neutral: "var(--fg-2)",
    blue: "var(--accent)",
    green: "var(--success)",
    amber: "var(--warning)",
    red: "var(--danger)",
    purple: "var(--purple-600)"
  };
  const c = TONES[tone] || TONES.neutral;
  const S = {
    sm: {
      fontSize: 11,
      padding: "1px 7px",
      height: 18,
      gap: 4
    },
    md: {
      fontSize: 12,
      padding: "2px 9px",
      height: 22,
      gap: 5
    },
    lg: {
      fontSize: 13,
      padding: "3px 11px",
      height: 26,
      gap: 6
    }
  }[size] || {};
  const skin = {
    soft: {
      background: "color-mix(in srgb, " + c + " 16%, transparent)",
      color: c,
      border: "1px solid transparent"
    },
    solid: {
      background: c,
      color: tone === "neutral" ? "var(--bg-canvas)" : "#FFFFFF",
      border: "1px solid transparent"
    },
    outline: {
      background: "transparent",
      color: c,
      border: "1px solid color-mix(in srgb, " + c + " 45%, transparent)"
    }
  }[variant] || {};
  return /*#__PURE__*/React.createElement("span", _extends({
    className: className,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: S.gap,
      height: S.height,
      padding: S.padding,
      borderRadius: "var(--radius-pill)",
      fontFamily: "var(--font-sans)",
      fontWeight: 500,
      fontSize: S.fontSize,
      lineHeight: 1,
      whiteSpace: "nowrap",
      boxSizing: "border-box",
      ...skin,
      ...style
    }
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "var(--radius-pill)",
      background: "currentColor"
    }
  }), leftIcon && /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-" + leftIcon,
    style: {
      fontSize: S.fontSize - 1
    }
  }), children, onRemove && /*#__PURE__*/React.createElement("button", {
    onClick: onRemove,
    "aria-label": "Remove",
    style: {
      border: "none",
      background: "transparent",
      color: "currentColor",
      cursor: "pointer",
      padding: 0,
      marginLeft: 1,
      display: "inline-flex",
      opacity: 0.7,
      fontSize: S.fontSize - 2
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-xmark"
  })));
}
Object.assign(__ds_scope, { Badge, __ds_default_components_Badge_xalxt9: Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Badge.jsx", error: String((e && e.message) || e) }); }

// components/Breadcrumb.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Breadcrumb — path trail. Last item is the current page.
function Breadcrumb({
  items = [],
  className,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("nav", _extends({
    "aria-label": "Breadcrumb",
    className: className,
    style: {
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 6,
      fontFamily: "var(--font-sans)",
      fontSize: 13,
      ...style
    }
  }, rest), items.map((it, i) => {
    const last = i === items.length - 1;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: i
    }, /*#__PURE__*/React.createElement("a", {
      href: it.href || "#",
      "aria-current": last ? "page" : undefined,
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: last ? "var(--fg-1)" : "var(--fg-2)",
        fontWeight: last ? 500 : 400,
        textDecoration: "none",
        pointerEvents: last ? "none" : "auto"
      }
    }, it.icon && /*#__PURE__*/React.createElement("i", {
      className: "fa-solid fa-" + it.icon,
      style: {
        fontSize: 12
      }
    }), it.label), !last && /*#__PURE__*/React.createElement("i", {
      className: "fa-solid fa-chevron-right",
      style: {
        fontSize: 10,
        color: "var(--fg-3)"
      }
    }));
  }));
}
Object.assign(__ds_scope, { Breadcrumb, __ds_default_components_Breadcrumb_bylaj5: Breadcrumb });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Breadcrumb.jsx", error: String((e && e.message) || e) }); }

// components/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Button — Springboard 2.0. Blue primary, dark-first. Token-driven.
function Button({
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  loading = false,
  disabled = false,
  children,
  className,
  style,
  ...rest
}) {
  const [h, setH] = React.useState(false);
  const [a, setA] = React.useState(false);
  const S = {
    sm: {
      height: 28,
      padding: "0 10px",
      fontSize: 12,
      radius: "var(--radius-md)",
      gap: 6,
      icon: 11
    },
    md: {
      height: 36,
      padding: "0 14px",
      fontSize: 14,
      radius: "var(--radius-lg)",
      gap: 8,
      icon: 13
    },
    lg: {
      height: 40,
      padding: "0 18px",
      fontSize: 14,
      radius: "var(--radius-lg)",
      gap: 8,
      icon: 14
    }
  }[size] || {};
  const V = {
    primary: {
      bg: "var(--accent)",
      hv: "var(--accent-hover)",
      ac: "var(--accent-pressed)",
      fg: "var(--accent-fg)",
      bd: "transparent"
    },
    secondary: {
      bg: "var(--bg-2)",
      hv: "var(--bg-3)",
      ac: "var(--bg-3)",
      fg: "var(--fg-1)",
      bd: "var(--border-2)"
    },
    outline: {
      bg: "transparent",
      hv: "var(--bg-2)",
      ac: "var(--bg-2)",
      fg: "var(--fg-1)",
      bd: "var(--border-2)"
    },
    ghost: {
      bg: "transparent",
      hv: "var(--bg-2)",
      ac: "var(--bg-2)",
      fg: "var(--fg-1)",
      bd: "transparent"
    },
    destructive: {
      bg: "var(--danger)",
      hv: "#BF1B2B",
      ac: "#A40E26",
      fg: "#FFFFFF",
      bd: "transparent"
    }
  }[variant] || {};
  const off = disabled || loading;
  const bg = off ? V.bg : a ? V.ac : h ? V.hv : V.bg;
  return /*#__PURE__*/React.createElement("button", _extends({
    className: className,
    disabled: off,
    "aria-busy": loading || undefined,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => {
      setH(false);
      setA(false);
    },
    onMouseDown: () => setA(true),
    onMouseUp: () => setA(false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: S.gap,
      height: S.height,
      padding: S.padding,
      borderRadius: S.radius,
      background: bg,
      color: V.fg,
      border: "1px solid " + V.bd,
      fontFamily: "var(--font-sans)",
      fontWeight: 500,
      fontSize: S.fontSize,
      lineHeight: 1,
      cursor: off ? "default" : "pointer",
      opacity: disabled ? 0.4 : 1,
      whiteSpace: "nowrap",
      transition: "background .15s ease, opacity .15s ease",
      outline: "none",
      ...style
    }
  }, rest), loading && /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-spinner",
    style: {
      fontSize: S.icon,
      animation: "ds-spin .8s linear infinite"
    }
  }), !loading && leftIcon && /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-" + leftIcon,
    style: {
      fontSize: S.icon
    }
  }), children, !loading && rightIcon && /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-" + rightIcon,
    style: {
      fontSize: S.icon
    }
  }));
}
Object.assign(__ds_scope, { Button, __ds_default_components_Button_xnw6d2: Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Button.jsx", error: String((e && e.message) || e) }); }

// components/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Card — elevated surface with optional title / description / footer.
function Card({
  title,
  description,
  footer,
  padding = 16,
  elevated = false,
  children,
  className,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: className,
    style: {
      background: "var(--bg-1)",
      border: "1px solid var(--border-1)",
      borderRadius: "var(--radius-lg)",
      boxShadow: elevated ? "var(--shadow-2)" : "none",
      overflow: "hidden",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      padding
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 16px/1.3 var(--font-sans)",
      color: "var(--fg-1)",
      marginBottom: description ? 4 : 0
    }
  }, title), description && /*#__PURE__*/React.createElement("div", {
    style: {
      font: "400 14px/1.45 var(--font-sans)",
      color: "var(--fg-2)"
    }
  }, description), children && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: title || description ? 12 : 0
    }
  }, children)), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px " + padding + "px",
      borderTop: "1px solid var(--border-1)",
      background: "var(--bg-canvas)",
      display: "flex",
      gap: 8,
      justifyContent: "flex-end"
    }
  }, footer));
}
Object.assign(__ds_scope, { Card, __ds_default_components_Card_1823whg: Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Card.jsx", error: String((e && e.message) || e) }); }

// components/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Checkbox — controlled, supports indeterminate + label.
function Checkbox({
  checked = false,
  indeterminate = false,
  disabled = false,
  label,
  onChange,
  className,
  style,
  ...rest
}) {
  const on = checked || indeterminate;
  return /*#__PURE__*/React.createElement("label", _extends({
    className: className,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      color: "var(--fg-1)",
      userSelect: "none",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    role: "checkbox",
    "aria-checked": indeterminate ? "mixed" : checked,
    onClick: () => !disabled && onChange && onChange(!checked),
    style: {
      width: 16,
      height: 16,
      borderRadius: "var(--radius-sm)",
      flexShrink: 0,
      background: on ? "var(--accent)" : "transparent",
      border: "1px solid " + (on ? "var(--accent)" : "var(--border-strong)"),
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#FFFFFF",
      fontSize: 9,
      transition: "background .15s ease, border-color .15s ease"
    }
  }, indeterminate ? /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-minus"
  }) : checked ? /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-check"
  }) : null), label);
}
Object.assign(__ds_scope, { Checkbox, __ds_default_components_Checkbox_1xt76yp: Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Input — text field with optional leading icon, error & disabled states.
function Input({
  size = "md",
  leftIcon,
  error = false,
  disabled = false,
  className,
  style,
  ...rest
}) {
  const [f, setF] = React.useState(false);
  const S = {
    sm: {
      height: 32,
      fontSize: 13,
      padLeft: leftIcon ? 30 : 10,
      padRight: 10
    },
    md: {
      height: 36,
      fontSize: 14,
      padLeft: leftIcon ? 34 : 12,
      padRight: 12
    },
    lg: {
      height: 40,
      fontSize: 14,
      padLeft: leftIcon ? 38 : 14,
      padRight: 14
    }
  }[size] || {};
  const border = error ? "var(--danger)" : f ? "var(--accent)" : "var(--border-2)";
  const ring = error ? "color-mix(in srgb, var(--danger) 30%, transparent)" : "var(--focus-ring)";
  return /*#__PURE__*/React.createElement("div", {
    className: className,
    style: {
      position: "relative",
      display: "inline-flex",
      width: "100%",
      ...style
    }
  }, leftIcon && /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-" + leftIcon,
    style: {
      position: "absolute",
      left: size === "lg" ? 14 : 12,
      top: "50%",
      transform: "translateY(-50%)",
      color: "var(--fg-3)",
      fontSize: S.fontSize - 1,
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("input", _extends({
    disabled: disabled,
    "aria-invalid": error || undefined,
    onFocus: e => {
      setF(true);
      rest.onFocus && rest.onFocus(e);
    },
    onBlur: e => {
      setF(false);
      rest.onBlur && rest.onBlur(e);
    },
    style: {
      width: "100%",
      height: S.height,
      boxSizing: "border-box",
      background: "var(--bg-1)",
      border: "1px solid " + border,
      borderRadius: "var(--radius-md)",
      padding: "0 " + S.padRight + "px 0 " + S.padLeft + "px",
      fontFamily: "var(--font-sans)",
      fontSize: S.fontSize,
      color: "var(--fg-1)",
      outline: "none",
      opacity: disabled ? 0.5 : 1,
      cursor: disabled ? "not-allowed" : "text",
      boxShadow: f ? "0 0 0 3px " + ring : "none",
      transition: "border-color .15s ease, box-shadow .15s ease"
    }
  }, rest)));
}
Object.assign(__ds_scope, { Input, __ds_default_components_Input_xfu66i: Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Input.jsx", error: String((e && e.message) || e) }); }

// components/Progress.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Progress — determinate bar (0–100) or indeterminate.
function Progress({
  value = 0,
  indeterminate = false,
  size = "md",
  tone = "blue",
  className,
  style,
  ...rest
}) {
  const h = {
    sm: 4,
    md: 6,
    lg: 8
  }[size] || 6;
  const c = {
    blue: "var(--accent)",
    green: "var(--success)",
    amber: "var(--warning)",
    red: "var(--danger)"
  }[tone] || "var(--accent)";
  const pct = Math.max(0, Math.min(100, value));
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "progressbar",
    "aria-valuenow": indeterminate ? undefined : pct,
    "aria-valuemin": 0,
    "aria-valuemax": 100,
    className: className,
    style: {
      width: "100%",
      height: h,
      background: "var(--bg-3)",
      borderRadius: "var(--radius-pill)",
      overflow: "hidden",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      borderRadius: "var(--radius-pill)",
      background: c,
      width: indeterminate ? "40%" : pct + "%",
      animation: indeterminate ? "ds-indeterminate 1.2s ease-in-out infinite" : "none",
      transition: indeterminate ? "none" : "width .3s ease"
    }
  }));
}
Object.assign(__ds_scope, { Progress, __ds_default_components_Progress_5n8ca7: Progress });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Progress.jsx", error: String((e && e.message) || e) }); }

// components/Radio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Radio — single control; compose several with one `name` for a group.
function Radio({
  checked = false,
  disabled = false,
  label,
  name,
  value,
  onChange,
  className,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", _extends({
    className: className,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      color: "var(--fg-1)",
      userSelect: "none",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    role: "radio",
    "aria-checked": checked,
    onClick: () => !disabled && onChange && onChange(value ?? true),
    style: {
      width: 16,
      height: 16,
      borderRadius: "var(--radius-pill)",
      flexShrink: 0,
      background: "transparent",
      border: "1px solid " + (checked ? "var(--accent)" : "var(--border-strong)"),
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "border-color .15s ease"
    }
  }, checked && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: "var(--radius-pill)",
      background: "var(--accent)"
    }
  })), label);
}
Object.assign(__ds_scope, { Radio, __ds_default_components_Radio_xlwmvd: Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Radio.jsx", error: String((e && e.message) || e) }); }

// components/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Select — styled native select with a chevron. Pass options or children.
function Select({
  options,
  size = "md",
  error = false,
  disabled = false,
  className,
  style,
  children,
  ...rest
}) {
  const [f, setF] = React.useState(false);
  const S = {
    sm: {
      height: 32,
      fontSize: 13
    },
    md: {
      height: 36,
      fontSize: 14
    },
    lg: {
      height: 40,
      fontSize: 14
    }
  }[size] || {};
  const border = error ? "var(--danger)" : f ? "var(--accent)" : "var(--border-2)";
  return /*#__PURE__*/React.createElement("div", {
    className: className,
    style: {
      position: "relative",
      display: "inline-flex",
      width: "100%",
      ...style
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    disabled: disabled,
    onFocus: e => {
      setF(true);
      rest.onFocus && rest.onFocus(e);
    },
    onBlur: e => {
      setF(false);
      rest.onBlur && rest.onBlur(e);
    },
    style: {
      width: "100%",
      height: S.height,
      boxSizing: "border-box",
      appearance: "none",
      background: "var(--bg-1)",
      border: "1px solid " + border,
      borderRadius: "var(--radius-md)",
      padding: "0 32px 0 12px",
      fontFamily: "var(--font-sans)",
      fontSize: S.fontSize,
      color: "var(--fg-1)",
      outline: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      boxShadow: f ? "0 0 0 3px var(--focus-ring)" : "none",
      transition: "border-color .15s ease, box-shadow .15s ease"
    }
  }, rest), options ? options.map((o, i) => {
    const opt = typeof o === "string" ? {
      value: o,
      label: o
    } : o;
    return /*#__PURE__*/React.createElement("option", {
      key: i,
      value: opt.value
    }, opt.label);
  }) : children), /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-chevron-down",
    style: {
      position: "absolute",
      right: 12,
      top: "50%",
      transform: "translateY(-50%)",
      color: "var(--fg-3)",
      fontSize: 11,
      pointerEvents: "none"
    }
  }));
}
Object.assign(__ds_scope, { Select, __ds_default_components_Select_18ciooq: Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Select.jsx", error: String((e && e.message) || e) }); }

// components/Skeleton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Skeleton — shimmering placeholder.
function Skeleton({
  variant = "text",
  width,
  height,
  className,
  style,
  ...rest
}) {
  const radius = variant === "circle" ? "var(--radius-pill)" : variant === "text" ? "var(--radius-sm)" : "var(--radius-md)";
  const h = height ?? (variant === "text" ? 12 : 40);
  const w = width ?? (variant === "text" ? "100%" : variant === "circle" ? h : "100%");
  return /*#__PURE__*/React.createElement("span", _extends({
    className: className,
    "aria-hidden": "true",
    style: {
      display: "block",
      width: w,
      height: h,
      borderRadius: radius,
      background: "linear-gradient(90deg, var(--bg-2) 25%, var(--bg-3) 37%, var(--bg-2) 63%)",
      backgroundSize: "400% 100%",
      animation: "ds-shimmer 1.4s ease infinite",
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Skeleton, __ds_default_components_Skeleton_1aev5en: Skeleton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Skeleton.jsx", error: String((e && e.message) || e) }); }

// components/Spinner.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Spinner — indeterminate loading ring.
function Spinner({
  size = 18,
  thickness = 2,
  color = "var(--accent)",
  className,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    role: "status",
    "aria-label": "Loading",
    className: className,
    style: {
      display: "inline-block",
      width: size,
      height: size,
      borderRadius: "var(--radius-pill)",
      border: thickness + "px solid var(--bg-3)",
      borderTopColor: color,
      animation: "ds-spin .7s linear infinite",
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Spinner, __ds_default_components_Spinner_1dx9c61: Spinner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Spinner.jsx", error: String((e && e.message) || e) }); }

// components/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Switch — toggle. Brand blue when on.
function Switch({
  checked = false,
  disabled = false,
  size = "md",
  label,
  onChange,
  className,
  style,
  ...rest
}) {
  const S = {
    sm: {
      w: 28,
      h: 16,
      k: 12
    },
    md: {
      w: 36,
      h: 20,
      k: 16
    }
  }[size] || {};
  return /*#__PURE__*/React.createElement("label", _extends({
    className: className,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      color: "var(--fg-1)",
      userSelect: "none",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    role: "switch",
    "aria-checked": checked,
    onClick: () => !disabled && onChange && onChange(!checked),
    style: {
      width: S.w,
      height: S.h,
      borderRadius: "var(--radius-pill)",
      flexShrink: 0,
      position: "relative",
      background: checked ? "var(--accent)" : "var(--bg-3)",
      transition: "background .15s ease"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 2,
      left: checked ? S.w - S.k - 2 : 2,
      width: S.k,
      height: S.k,
      borderRadius: "var(--radius-pill)",
      background: "#FFFFFF",
      transition: "left .15s ease",
      boxShadow: "var(--shadow-1)"
    }
  })), label);
}
Object.assign(__ds_scope, { Switch, __ds_default_components_Switch_18p697w: Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Switch.jsx", error: String((e && e.message) || e) }); }

// components/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Tabs — underline style. Controlled via value/onChange.
function Tabs({
  items = [],
  value,
  onChange,
  className,
  style,
  ...rest
}) {
  const active = value ?? (items[0] && items[0].value);
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "tablist",
    className: className,
    style: {
      display: "flex",
      gap: 4,
      borderBottom: "1px solid var(--border-1)",
      ...style
    }
  }, rest), items.map(it => {
    const on = it.value === active;
    return /*#__PURE__*/React.createElement("button", {
      key: it.value,
      role: "tab",
      "aria-selected": on,
      onClick: () => onChange && onChange(it.value),
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "9px 12px",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
        fontWeight: 500,
        fontSize: 14,
        color: on ? "var(--fg-1)" : "var(--fg-2)",
        borderBottom: "2px solid " + (on ? "var(--accent)" : "transparent"),
        marginBottom: -1,
        transition: "color .15s ease"
      }
    }, it.icon && /*#__PURE__*/React.createElement("i", {
      className: "fa-solid fa-" + it.icon,
      style: {
        fontSize: 13
      }
    }), it.label);
  }));
}
Object.assign(__ds_scope, { Tabs, __ds_default_components_Tabs_182gzhg: Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Textarea — multi-line field with focus & error states.
function Textarea({
  error = false,
  disabled = false,
  rows = 4,
  className,
  style,
  ...rest
}) {
  const [f, setF] = React.useState(false);
  const border = error ? "var(--danger)" : f ? "var(--accent)" : "var(--border-2)";
  const ring = error ? "color-mix(in srgb, var(--danger) 30%, transparent)" : "var(--focus-ring)";
  return /*#__PURE__*/React.createElement("textarea", _extends({
    className: className,
    disabled: disabled,
    rows: rows,
    "aria-invalid": error || undefined,
    onFocus: e => {
      setF(true);
      rest.onFocus && rest.onFocus(e);
    },
    onBlur: e => {
      setF(false);
      rest.onBlur && rest.onBlur(e);
    },
    style: {
      width: "100%",
      boxSizing: "border-box",
      resize: "vertical",
      minHeight: 64,
      background: "var(--bg-1)",
      border: "1px solid " + border,
      borderRadius: "var(--radius-md)",
      padding: "8px 12px",
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      lineHeight: 1.5,
      color: "var(--fg-1)",
      outline: "none",
      opacity: disabled ? 0.5 : 1,
      boxShadow: f ? "0 0 0 3px " + ring : "none",
      transition: "border-color .15s ease, box-shadow .15s ease",
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Textarea, __ds_default_components_Textarea_1vapk48: Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/Toast.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Toast — notification surface. type drives the accent + icon.
function Toast({
  type = "info",
  title,
  onClose,
  children,
  className,
  style,
  ...rest
}) {
  const MAP = {
    info: {
      c: "var(--accent)",
      icon: "circle-info"
    },
    success: {
      c: "var(--success)",
      icon: "circle-check"
    },
    warning: {
      c: "var(--warning)",
      icon: "triangle-exclamation"
    },
    error: {
      c: "var(--danger)",
      icon: "circle-exclamation"
    }
  }[type] || {};
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "status",
    className: className,
    style: {
      display: "flex",
      gap: 12,
      alignItems: "flex-start",
      width: 360,
      maxWidth: "100%",
      padding: "13px 14px",
      borderRadius: "var(--radius-lg)",
      background: "var(--bg-2)",
      border: "1px solid var(--border-2)",
      boxShadow: "var(--shadow-3)",
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-" + MAP.icon,
    style: {
      color: MAP.c,
      fontSize: 16,
      marginTop: 1,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      color: "var(--fg-1)",
      marginBottom: children ? 2 : 0
    }
  }, title), children && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      lineHeight: 1.45,
      color: "var(--fg-2)"
    }
  }, children)), onClose && /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Close",
    style: {
      border: "none",
      background: "transparent",
      color: "var(--fg-3)",
      cursor: "pointer",
      padding: 0,
      fontSize: 14,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-xmark"
  })));
}
Object.assign(__ds_scope, { Toast, __ds_default_components_Toast_xnm6xx: Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Toast.jsx", error: String((e && e.message) || e) }); }

// components/Tooltip.jsx
try { (() => {
// Tooltip — hover/focus label. Wraps a single trigger child.
function Tooltip({
  label,
  side = "top",
  children,
  style
}) {
  const [show, setShow] = React.useState(false);
  const pos = {
    top: {
      bottom: "100%",
      left: "50%",
      transform: "translateX(-50%)",
      marginBottom: 6
    },
    bottom: {
      top: "100%",
      left: "50%",
      transform: "translateX(-50%)",
      marginTop: 6
    },
    left: {
      right: "100%",
      top: "50%",
      transform: "translateY(-50%)",
      marginRight: 6
    },
    right: {
      left: "100%",
      top: "50%",
      transform: "translateY(-50%)",
      marginLeft: 6
    }
  }[side];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      display: "inline-flex",
      ...style
    },
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false),
    onFocus: () => setShow(true),
    onBlur: () => setShow(false)
  }, children, show && /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    style: {
      position: "absolute",
      zIndex: 50,
      whiteSpace: "nowrap",
      pointerEvents: "none",
      background: "var(--bg-2)",
      color: "var(--fg-1)",
      border: "1px solid var(--border-2)",
      borderRadius: "var(--radius-md)",
      padding: "5px 9px",
      boxShadow: "var(--shadow-2)",
      fontFamily: "var(--font-sans)",
      fontSize: 12,
      lineHeight: 1.3,
      ...pos
    }
  }, label));
}
Object.assign(__ds_scope, { Tooltip, __ds_default_components_Tooltip_1yr2a85: Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Tooltip.jsx", error: String((e && e.message) || e) }); }

// ui_kits/springboard/App.jsx
try { (() => {
// App.jsx — top-level shell
const Toast = ({
  toast,
  onDismiss
}) => {
  if (!toast) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 100,
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      minWidth: 320,
      maxWidth: 400,
      background: '#1A1B22',
      border: '1px solid #28292F',
      borderRadius: 8,
      padding: '12px 14px',
      boxShadow: '0 10px 24px rgba(0,0,0,.3)',
      animation: 'slideUp .25s ease-out'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 28,
      height: 28,
      borderRadius: 6,
      background: 'rgba(26,127,55,.18)',
      color: '#2EA043',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-check"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 500,
      color: '#F2F3F7'
    }
  }, toast.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#ADAFB7',
      marginTop: 2
    }
  }, toast.body)), /*#__PURE__*/React.createElement("button", {
    onClick: onDismiss,
    style: {
      background: 'transparent',
      border: 'none',
      color: '#74757E',
      cursor: 'pointer',
      padding: 4
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-xmark"
  })));
};
const App = () => {
  const [authed, setAuthed] = React.useState(false);
  const [view, setView] = React.useState('dashboard');
  const [toast, setToast] = React.useState(null);
  const showToast = (title, body) => {
    setToast({
      title,
      body
    });
    setTimeout(() => setToast(null), 3500);
  };
  if (!authed) return /*#__PURE__*/React.createElement(Login, {
    onLogin: () => {
      setAuthed(true);
      showToast('Welcome back', 'Signed in as sasha@whitespace');
    }
  });
  const titles = {
    dashboard: {
      title: 'Overview',
      crumbs: ['Whitespace']
    },
    library: {
      title: 'Library',
      crumbs: ['Whitespace']
    },
    templates: {
      title: 'Settings',
      crumbs: ['Whitespace']
    },
    team: {
      title: 'Team',
      crumbs: ['Whitespace']
    },
    activity: {
      title: 'Activity',
      crumbs: ['Whitespace']
    }
  };
  const t = titles[view];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: '100vh',
      background: '#0E0F12'
    }
  }, /*#__PURE__*/React.createElement(Sidebar, {
    view: view,
    setView: setView
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(Header, {
    title: t.title,
    crumbs: t.crumbs,
    actions: /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "outline",
      icon: "share-from-square"
    }, "Share")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'hidden',
      display: 'flex'
    }
  }, view === 'dashboard' && /*#__PURE__*/React.createElement(Dashboard, {
    onToast: showToast
  }), view === 'library' && /*#__PURE__*/React.createElement(Library, null), view === 'templates' && /*#__PURE__*/React.createElement(Templates, null), view === 'team' && /*#__PURE__*/React.createElement(Library, null), view === 'activity' && /*#__PURE__*/React.createElement(Dashboard, {
    onToast: showToast
  }))), /*#__PURE__*/React.createElement(Toast, {
    toast: toast,
    onDismiss: () => setToast(null)
  }));
};
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/springboard/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/springboard/Dashboard.jsx
try { (() => {
// Dashboard.jsx — landing view with stats, recent activity, and a data table
const StatCard = ({
  label,
  value,
  delta,
  deltaTone = 'green',
  icon
}) => /*#__PURE__*/React.createElement(Card, {
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    flex: 1
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 12,
    color: '#ADAFB7',
    fontWeight: 500
  }
}, label), /*#__PURE__*/React.createElement("div", {
  style: {
    width: 28,
    height: 28,
    borderRadius: 6,
    background: '#28292F',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ADAFB7'
  }
}, /*#__PURE__*/React.createElement("i", {
  className: `fa-solid fa-${icon}`,
  style: {
    fontSize: 12
  }
}))), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 28,
    fontWeight: 600,
    color: '#fff',
    letterSpacing: '-0.01em'
  }
}, value), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    color: deltaTone === 'green' ? '#2EA043' : '#F85149',
    display: 'flex',
    alignItems: 'center',
    gap: 4
  }
}, /*#__PURE__*/React.createElement("i", {
  className: `fa-solid fa-arrow-trend-${deltaTone === 'green' ? 'up' : 'down'}`,
  style: {
    fontSize: 10
  }
}), delta), /*#__PURE__*/React.createElement("span", {
  style: {
    color: '#74757E'
  }
}, "vs last week")));
const ActivityRow = ({
  initials,
  name,
  action,
  target,
  time
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 0',
    borderBottom: '1px solid #1A1B22'
  }
}, /*#__PURE__*/React.createElement(Avatar, {
  initials: initials,
  size: 28
}), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1,
    fontSize: 13,
    color: '#ADAFB7',
    minWidth: 0
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    color: '#F2F3F7',
    fontWeight: 500
  }
}, name), " ", action, ' ', /*#__PURE__*/React.createElement("span", {
  style: {
    color: '#F2F3F7'
  }
}, target)), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 12,
    color: '#74757E'
  }
}, time));
const TableRow = ({
  row,
  selected,
  onSelect
}) => /*#__PURE__*/React.createElement("tr", {
  style: {
    borderBottom: '1px solid #1A1B22'
  }
}, /*#__PURE__*/React.createElement("td", {
  style: {
    padding: '12px 16px',
    width: 32
  }
}, /*#__PURE__*/React.createElement(Checkbox, {
  on: selected,
  onChange: onSelect
})), /*#__PURE__*/React.createElement("td", {
  style: {
    padding: '12px 16px'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 10
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 22,
    height: 22,
    borderRadius: 4,
    background: row.tone,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 10,
    fontWeight: 600
  }
}, row.short), /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 13,
    fontWeight: 500,
    color: '#F2F3F7'
  }
}, row.name))), /*#__PURE__*/React.createElement("td", {
  style: {
    padding: '12px 16px'
  }
}, /*#__PURE__*/React.createElement(Badge, {
  tone: row.statusTone,
  dot: true
}, row.status)), /*#__PURE__*/React.createElement("td", {
  style: {
    padding: '12px 16px',
    fontSize: 13,
    color: '#ADAFB7'
  }
}, row.owner), /*#__PURE__*/React.createElement("td", {
  style: {
    padding: '12px 16px',
    fontSize: 13,
    color: '#ADAFB7',
    fontFamily: 'Geist Mono, monospace'
  }
}, row.updated), /*#__PURE__*/React.createElement("td", {
  style: {
    padding: '12px 16px',
    textAlign: 'right'
  }
}, /*#__PURE__*/React.createElement(IconButton, {
  icon: "ellipsis"
})));
const Dashboard = ({
  onToast
}) => {
  const [selected, setSelected] = React.useState(new Set([1]));
  const toggle = i => {
    const next = new Set(selected);
    next.has(i) ? next.delete(i) : next.add(i);
    setSelected(next);
  };
  const rows = [{
    name: 'Authentication flow',
    short: 'AF',
    tone: '#1F6FEB',
    status: 'Live',
    statusTone: 'green',
    owner: 'Sasha Kim',
    updated: '2d ago'
  }, {
    name: 'Onboarding tour',
    short: 'OT',
    tone: '#8A38F5',
    status: 'Review',
    statusTone: 'amber',
    owner: 'Mira R.',
    updated: '6h ago'
  }, {
    name: 'Settings rebuild',
    short: 'SR',
    tone: '#1A7F37',
    status: 'In progress',
    statusTone: 'blue',
    owner: 'Alex L.',
    updated: '1d ago'
  }, {
    name: 'Pricing page v3',
    short: 'PP',
    tone: '#DA3633',
    status: 'Blocked',
    statusTone: 'red',
    owner: 'Jamie T.',
    updated: '3d ago'
  }, {
    name: 'Mobile drawer',
    short: 'MD',
    tone: '#BF8700',
    status: 'Draft',
    statusTone: 'grey',
    owner: 'Priya N.',
    updated: '5h ago'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: '24px 32px',
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      overflow: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 24,
      fontWeight: 600,
      color: '#fff',
      letterSpacing: '-0.01em'
    }
  }, "Welcome back, Sasha"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: '#ADAFB7',
      marginTop: 4
    }
  }, "Here's what your team has been up to this week.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    icon: "filter"
  }, "Filter"), /*#__PURE__*/React.createElement(Button, {
    icon: "plus",
    onClick: () => onToast('Project created', 'New project "Untitled" was added to your workspace.')
  }, "New project"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    label: "Active projects",
    value: "24",
    delta: "+3",
    deltaTone: "green",
    icon: "folder-open"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "Components shipped",
    value: "312",
    delta: "+18",
    deltaTone: "green",
    icon: "cube"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "Open reviews",
    value: "7",
    delta: "-2",
    deltaTone: "green",
    icon: "code-pull-request"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "Failed builds",
    value: "2",
    delta: "+1",
    deltaTone: "red",
    icon: "triangle-exclamation"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: 0
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '14px 16px',
      borderBottom: '1px solid #28292F'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: '#fff'
    }
  }, "Projects"), /*#__PURE__*/React.createElement(Badge, {
    tone: "grey"
  }, rows.length), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Input, {
    icon: "magnifying-glass",
    placeholder: "Search",
    style: {
      width: 200,
      flex: 'none'
    }
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "sm",
    icon: "arrow-down-wide-short"
  }, "Sort"))), /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      borderBottom: '1px solid #28292F'
    }
  }, /*#__PURE__*/React.createElement("th", {
    style: {
      padding: '10px 16px',
      width: 32
    }
  }, /*#__PURE__*/React.createElement(Checkbox, {
    on: false,
    onChange: () => {}
  })), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: '10px 16px',
      textAlign: 'left',
      fontSize: 11,
      fontWeight: 500,
      color: '#74757E',
      textTransform: 'uppercase',
      letterSpacing: '0.06em'
    }
  }, "Project"), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: '10px 16px',
      textAlign: 'left',
      fontSize: 11,
      fontWeight: 500,
      color: '#74757E',
      textTransform: 'uppercase',
      letterSpacing: '0.06em'
    }
  }, "Status"), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: '10px 16px',
      textAlign: 'left',
      fontSize: 11,
      fontWeight: 500,
      color: '#74757E',
      textTransform: 'uppercase',
      letterSpacing: '0.06em'
    }
  }, "Owner"), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: '10px 16px',
      textAlign: 'left',
      fontSize: 11,
      fontWeight: 500,
      color: '#74757E',
      textTransform: 'uppercase',
      letterSpacing: '0.06em'
    }
  }, "Updated"), /*#__PURE__*/React.createElement("th", {
    style: {
      width: 40
    }
  }))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, i) => /*#__PURE__*/React.createElement(TableRow, {
    key: i,
    row: r,
    selected: selected.has(i),
    onSelect: () => toggle(i)
  }))))), /*#__PURE__*/React.createElement(Card, {
    padding: 0
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      padding: '14px 16px',
      borderBottom: '1px solid #28292F'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: '#fff'
    }
  }, "Activity"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      marginLeft: 'auto',
      fontSize: 12,
      color: '#4185EE',
      textDecoration: 'none'
    }
  }, "View all")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '4px 16px 14px'
    }
  }, /*#__PURE__*/React.createElement(ActivityRow, {
    initials: "MR",
    name: "Mira R.",
    action: "approved",
    target: "Onboarding tour",
    time: "6h"
  }), /*#__PURE__*/React.createElement(ActivityRow, {
    initials: "AL",
    name: "Alex L.",
    action: "opened a PR on",
    target: "Settings rebuild",
    time: "1d"
  }), /*#__PURE__*/React.createElement(ActivityRow, {
    initials: "JT",
    name: "Jamie T.",
    action: "blocked",
    target: "Pricing page v3",
    time: "3d"
  }), /*#__PURE__*/React.createElement(ActivityRow, {
    initials: "PN",
    name: "Priya N.",
    action: "commented on",
    target: "Mobile drawer",
    time: "5h"
  }), /*#__PURE__*/React.createElement(ActivityRow, {
    initials: "SK",
    name: "You",
    action: "renamed",
    target: "Auth flow",
    time: "2d"
  })))));
};
window.Dashboard = Dashboard;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/springboard/Dashboard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/springboard/Header.jsx
try { (() => {
// Header.jsx — top bar with breadcrumbs, search, actions
const Header = ({
  title,
  crumbs = [],
  actions
}) => /*#__PURE__*/React.createElement("header", {
  style: {
    height: 56,
    padding: '0 24px',
    borderBottom: '1px solid #1A1B22',
    background: '#0E0F12',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flexShrink: 0
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13
  }
}, crumbs.map((c, i) => /*#__PURE__*/React.createElement(React.Fragment, {
  key: i
}, /*#__PURE__*/React.createElement("span", {
  style: {
    color: '#74757E'
  }
}, c), /*#__PURE__*/React.createElement("i", {
  className: "fa-solid fa-chevron-right",
  style: {
    color: '#3E3F47',
    fontSize: 9
  }
}))), /*#__PURE__*/React.createElement("span", {
  style: {
    color: '#F2F3F7',
    fontWeight: 500
  }
}, title)), /*#__PURE__*/React.createElement("div", {
  style: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: 8
  }
}, actions, /*#__PURE__*/React.createElement(IconButton, {
  icon: "bell"
}), /*#__PURE__*/React.createElement(IconButton, {
  icon: "circle-question"
}), /*#__PURE__*/React.createElement(Avatar, {
  initials: "SK",
  size: 28
})));
window.Header = Header;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/springboard/Header.jsx", error: String((e && e.message) || e) }); }

// ui_kits/springboard/Library.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Library.jsx — components grid view
const ComponentTile = ({
  name,
  count,
  icon,
  tone
}) => /*#__PURE__*/React.createElement(Card, {
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    cursor: 'pointer',
    transition: 'border-color .15s'
  },
  onMouseEnter: e => e.currentTarget.style.borderColor = '#3E3F47',
  onMouseLeave: e => e.currentTarget.style.borderColor = '#28292F'
}, /*#__PURE__*/React.createElement("div", {
  style: {
    height: 100,
    borderRadius: 6,
    background: tone,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 32
  }
}, /*#__PURE__*/React.createElement("i", {
  className: `fa-solid fa-${icon}`
})), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 14,
    fontWeight: 500,
    color: '#F2F3F7'
  }
}, name), /*#__PURE__*/React.createElement(Badge, {
  tone: "grey"
}, count)));
const Library = () => {
  const tiles = [{
    name: 'Button',
    count: 24,
    icon: 'square-pollvertical',
    tone: 'linear-gradient(135deg,#1F6FEB,#1158C7)'
  }, {
    name: 'Input',
    count: 18,
    icon: 'i-cursor',
    tone: 'linear-gradient(135deg,#28292F,#1A1B22)'
  }, {
    name: 'Calendar',
    count: 12,
    icon: 'calendar',
    tone: 'linear-gradient(135deg,#8A38F5,#6144C1)'
  }, {
    name: 'Data Table',
    count: 32,
    icon: 'table',
    tone: 'linear-gradient(135deg,#1A7F37,#0E5A24)'
  }, {
    name: 'Dropdown',
    count: 16,
    icon: 'caret-down',
    tone: 'linear-gradient(135deg,#3E3F47,#1A1B22)'
  }, {
    name: 'Toast',
    count: 8,
    icon: 'comment-dots',
    tone: 'linear-gradient(135deg,#BF8700,#7A5500)'
  }, {
    name: 'Tabs',
    count: 6,
    icon: 'list',
    tone: 'linear-gradient(135deg,#28292F,#0E0F12)'
  }, {
    name: 'Dialog',
    count: 10,
    icon: 'window-maximize',
    tone: 'linear-gradient(135deg,#DA3633,#8B0E0E)'
  }, {
    name: 'Sidebar',
    count: 4,
    icon: 'bars-staggered',
    tone: 'linear-gradient(135deg,#4185EE,#1F6FEB)'
  }, {
    name: 'Avatar',
    count: 9,
    icon: 'user',
    tone: 'linear-gradient(135deg,#A77BF8,#8A38F5)'
  }, {
    name: 'Badge',
    count: 14,
    icon: 'tag',
    tone: 'linear-gradient(135deg,#2EA043,#1A7F37)'
  }, {
    name: 'Tooltip',
    count: 6,
    icon: 'circle-info',
    tone: 'linear-gradient(135deg,#74757E,#3E3F47)'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: '24px 32px',
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      overflow: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 24,
      fontWeight: 600,
      color: '#fff',
      letterSpacing: '-0.01em'
    }
  }, "Component library"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: '#ADAFB7',
      marginTop: 4
    }
  }, "Browse the ", tiles.reduce((a, b) => a + b.count, 0), " components in Springboard 2.0.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Input, {
    icon: "magnifying-glass",
    placeholder: "Search components",
    style: {
      width: 240,
      flex: 'none'
    }
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    icon: "sliders"
  }, "Filter"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      padding: '0 0 8px',
      borderBottom: '1px solid #1A1B22'
    }
  }, ['All', 'Atoms', 'Forms', 'Navigation', 'Feedback', 'Data display', 'Overlays'].map((t, i) => /*#__PURE__*/React.createElement("button", {
    key: t,
    style: {
      padding: '8px 12px',
      background: i === 0 ? '#1A1B22' : 'transparent',
      color: i === 0 ? '#fff' : '#ADAFB7',
      border: 'none',
      borderRadius: 6,
      fontFamily: 'Inter, sans-serif',
      fontSize: 13,
      fontWeight: i === 0 ? 500 : 400,
      cursor: 'pointer'
    }
  }, t))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 16
    }
  }, tiles.map(t => /*#__PURE__*/React.createElement(ComponentTile, _extends({
    key: t.name
  }, t)))));
};
window.Library = Library;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/springboard/Library.jsx", error: String((e && e.message) || e) }); }

// ui_kits/springboard/Login.jsx
try { (() => {
// Login.jsx — the entry screen
const Login = ({
  onLogin
}) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('••••••••');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: '100vh',
      background: 'url(../../assets/bg/cover-gradient.png) center/cover no-repeat, #0E0F12',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: 32,
    style: {
      width: 396,
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(WLogo, {
    size: 40
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 600,
      color: '#fff',
      marginTop: 14
    }
  }, "Login to your account"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: '#ADAFB7'
    }
  }, "Enter your email below to login to your account.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 13,
      fontWeight: 500,
      color: '#F2F3F7'
    }
  }, "Email"), /*#__PURE__*/React.createElement(Input, {
    value: email,
    onChange: e => setEmail(e.target.value),
    placeholder: "you@example.com"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 13,
      fontWeight: 500,
      color: '#F2F3F7'
    }
  }, "Password"), /*#__PURE__*/React.createElement("a", {
    style: {
      fontSize: 12,
      color: '#4185EE',
      textDecoration: 'none'
    },
    href: "#"
  }, "Forgot password?")), /*#__PURE__*/React.createElement(Input, {
    type: "password",
    value: password,
    onChange: e => setPassword(e.target.value)
  })), /*#__PURE__*/React.createElement(Button, {
    onClick: onLogin,
    style: {
      width: '100%',
      justifyContent: 'center',
      height: 38
    }
  }, "Login"), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    style: {
      width: '100%',
      justifyContent: 'center',
      height: 38,
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/social/google.svg",
    alt: "",
    style: {
      width: 16,
      height: 16
    }
  }), "Login with Google")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      fontSize: 13,
      color: '#ADAFB7'
    }
  }, "Don't have an account? ", /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: '#fff',
      textDecoration: 'underline'
    }
  }, "Sign up"))));
};
window.Login = Login;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/springboard/Login.jsx", error: String((e && e.message) || e) }); }

// ui_kits/springboard/Sidebar.jsx
try { (() => {
// Sidebar.jsx — left navigation rail for Springboard
const Sidebar = ({
  view,
  setView
}) => {
  const items = [{
    id: 'dashboard',
    icon: 'house',
    label: 'Dashboard'
  }, {
    id: 'library',
    icon: 'shapes',
    label: 'Library'
  }, {
    id: 'templates',
    icon: 'layer-group',
    label: 'Templates'
  }, {
    id: 'team',
    icon: 'users',
    label: 'Team'
  }, {
    id: 'activity',
    icon: 'wave-pulse',
    label: 'Activity'
  }];
  const projects = [{
    id: 'p1',
    label: 'Marketing site',
    tone: '#1F6FEB'
  }, {
    id: 'p2',
    label: 'Mobile app',
    tone: '#8A38F5'
  }, {
    id: 'p3',
    label: 'Springboard core',
    tone: '#1A7F37'
  }];
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 240,
      background: '#0E0F12',
      borderRight: '1px solid #1A1B22',
      display: 'flex',
      flexDirection: 'column',
      padding: '14px 10px',
      gap: 4,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '4px 8px 14px'
    }
  }, /*#__PURE__*/React.createElement(WLogo, {
    size: 28
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: '#F2F3F7'
    }
  }, "Whitespace"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#74757E'
    }
  }, "Springboard 2.0")), /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-chevron-down",
    style: {
      marginLeft: 'auto',
      color: '#74757E',
      fontSize: 11
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '7px 10px',
      marginBottom: 4,
      background: '#1A1B22',
      border: '1px solid #28292F',
      borderRadius: 6,
      fontSize: 12,
      color: '#74757E',
      cursor: 'text'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-magnifying-glass",
    style: {
      fontSize: 11
    }
  }), "Search", /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      fontFamily: 'Geist Mono, monospace',
      fontSize: 10,
      padding: '1px 5px',
      background: '#28292F',
      borderRadius: 3,
      color: '#ADAFB7'
    }
  }, "\u2318K")), items.map(it => /*#__PURE__*/React.createElement("button", {
    key: it.id,
    onClick: () => setView(it.id),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '7px 10px',
      background: view === it.id ? '#1A1B22' : 'transparent',
      color: view === it.id ? '#F2F3F7' : '#ADAFB7',
      border: 'none',
      borderRadius: 6,
      fontFamily: 'Inter, sans-serif',
      fontSize: 13,
      fontWeight: view === it.id ? 500 : 400,
      cursor: 'pointer',
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: `fa-solid fa-${it.icon}`,
    style: {
      width: 14,
      fontSize: 12
    }
  }), it.label, it.id === 'activity' && /*#__PURE__*/React.createElement(Badge, {
    tone: "blue",
    style: {
      marginLeft: 'auto',
      padding: '1px 6px',
      fontSize: 10
    }
  }, "3"))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 500,
      color: '#5C5D64',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      padding: '20px 10px 6px'
    }
  }, "Projects"), projects.map(p => /*#__PURE__*/React.createElement("button", {
    key: p.id,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '6px 10px',
      background: 'transparent',
      color: '#ADAFB7',
      border: 'none',
      borderRadius: 6,
      fontFamily: 'Inter, sans-serif',
      fontSize: 13,
      cursor: 'pointer',
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 2,
      background: p.tone
    }
  }), p.label)), /*#__PURE__*/React.createElement("button", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '6px 10px',
      background: 'transparent',
      color: '#74757E',
      border: 'none',
      borderRadius: 6,
      fontFamily: 'Inter, sans-serif',
      fontSize: 12,
      cursor: 'pointer',
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-plus",
    style: {
      width: 14,
      fontSize: 11
    }
  }), "New project"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: 8,
      borderTop: '1px solid #1A1B22'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    initials: "SK",
    size: 28
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 500,
      color: '#F2F3F7'
    }
  }, "Sasha Kim"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#74757E'
    }
  }, "sasha@whitespace")), /*#__PURE__*/React.createElement(IconButton, {
    icon: "gear"
  })));
};
window.Sidebar = Sidebar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/springboard/Sidebar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/springboard/Templates.jsx
try { (() => {
// Templates.jsx — settings + templates page demonstrating forms
const Templates = () => {
  const [notif, setNotif] = React.useState(true);
  const [autosave, setAutosave] = React.useState(true);
  const [analytics, setAnalytics] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: '24px 32px',
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
      overflow: 'auto',
      maxWidth: 880
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 24,
      fontWeight: 600,
      color: '#fff',
      letterSpacing: '-0.01em'
    }
  }, "Workspace settings"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: '#ADAFB7',
      marginTop: 4
    }
  }, "Manage how Whitespace behaves for everyone in your team.")), /*#__PURE__*/React.createElement(Card, {
    padding: 20,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: '#fff'
    }
  }, "General"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 13,
      fontWeight: 500,
      color: '#F2F3F7'
    }
  }, "Workspace name"), /*#__PURE__*/React.createElement(Input, {
    placeholder: "Whitespace"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 13,
      fontWeight: 500,
      color: '#F2F3F7'
    }
  }, "Subdomain"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 0,
      alignItems: 'stretch'
    }
  }, /*#__PURE__*/React.createElement(Input, {
    value: "whitespace",
    style: {
      borderTopRightRadius: 0,
      borderBottomRightRadius: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#28292F',
      border: '1px solid #3E3F47',
      borderLeft: 'none',
      borderTopRightRadius: 6,
      borderBottomRightRadius: 6,
      padding: '0 12px',
      display: 'flex',
      alignItems: 'center',
      fontSize: 13,
      color: '#ADAFB7',
      fontFamily: 'Geist Mono, monospace'
    }
  }, ".springboard.app")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#74757E'
    }
  }, "This will be the URL your team uses to access the workspace.")))), /*#__PURE__*/React.createElement(Card, {
    padding: 20,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: '#fff'
    }
  }, "Preferences"), [{
    k: 'Email notifications',
    v: 'Get a digest of activity in your projects.',
    on: notif,
    set: setNotif
  }, {
    k: 'Autosave changes',
    v: 'Save edits to drafts every few seconds.',
    on: autosave,
    set: setAutosave
  }, {
    k: 'Anonymous analytics',
    v: 'Help us improve Springboard by sharing usage data.',
    on: analytics,
    set: setAnalytics
  }].map(row => /*#__PURE__*/React.createElement("div", {
    key: row.k,
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '8px 0',
      borderTop: '1px solid #28292F'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 500,
      color: '#F2F3F7'
    }
  }, row.k), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#ADAFB7',
      marginTop: 2
    }
  }, row.v)), /*#__PURE__*/React.createElement(Switch, {
    on: row.on,
    onChange: row.set
  })))), /*#__PURE__*/React.createElement(Card, {
    padding: 20,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      borderColor: 'rgba(218,54,51,0.3)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: '#F85149'
    }
  }, "Danger zone"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 500,
      color: '#F2F3F7'
    }
  }, "Delete workspace"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#ADAFB7',
      marginTop: 2
    }
  }, "Permanently remove the workspace and all its projects. This cannot be undone.")), /*#__PURE__*/React.createElement(Button, {
    variant: "danger"
  }, "Delete workspace"))));
};
window.Templates = Templates;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/springboard/Templates.jsx", error: String((e && e.message) || e) }); }

// ui_kits/springboard/ui.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// ui.jsx — atomic primitives shared across the Springboard kit
// Loaded after React + Babel; exports to window so other Babel scripts can reach it.

const Button = ({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  onClick,
  disabled,
  style,
  ...rest
}) => {
  const sizes = {
    sm: {
      padding: '4px 10px',
      fontSize: 12,
      height: 28,
      borderRadius: 6
    },
    md: {
      padding: '8px 12px',
      fontSize: 14,
      height: 36,
      borderRadius: 8
    },
    lg: {
      padding: '10px 16px',
      fontSize: 14,
      height: 40,
      borderRadius: 8
    }
  };
  const variants = {
    primary: {
      background: '#1F6FEB',
      color: '#F2F3F7',
      border: '1px solid transparent'
    },
    outline: {
      background: 'transparent',
      color: '#F2F3F7',
      border: '1px solid #3E3F47'
    },
    ghost: {
      background: 'transparent',
      color: '#F2F3F7',
      border: '1px solid transparent'
    },
    danger: {
      background: '#DA3633',
      color: '#fff',
      border: '1px solid transparent'
    },
    secondary: {
      background: '#28292F',
      color: '#F2F3F7',
      border: '1px solid #3E3F47'
    }
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    onClick: onClick,
    disabled: disabled,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      fontFamily: 'Inter, sans-serif',
      fontWeight: 500,
      lineHeight: 1,
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      transition: 'background .15s, opacity .15s',
      whiteSpace: 'nowrap',
      ...sizes[size],
      ...variants[variant],
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement("i", {
    className: `fa-solid fa-${icon}`,
    style: {
      fontSize: size === 'sm' ? 11 : 13
    }
  }), children);
};
const IconButton = ({
  icon,
  onClick,
  active,
  size = 32,
  title
}) => /*#__PURE__*/React.createElement("button", {
  onClick: onClick,
  title: title,
  style: {
    width: size,
    height: size,
    borderRadius: 6,
    background: active ? '#28292F' : 'transparent',
    border: '1px solid transparent',
    color: active ? '#fff' : '#ADAFB7',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all .15s'
  },
  onMouseEnter: e => !active && (e.currentTarget.style.background = '#1F2027', e.currentTarget.style.color = '#fff'),
  onMouseLeave: e => !active && (e.currentTarget.style.background = 'transparent', e.currentTarget.style.color = '#ADAFB7')
}, /*#__PURE__*/React.createElement("i", {
  className: `fa-solid fa-${icon}`,
  style: {
    fontSize: 13
  }
}));
const Input = ({
  icon,
  value,
  onChange,
  placeholder,
  type = 'text',
  style,
  ...rest
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'relative',
    flex: 1,
    ...style
  }
}, icon && /*#__PURE__*/React.createElement("i", {
  className: `fa-solid fa-${icon}`,
  style: {
    position: 'absolute',
    left: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#74757E',
    fontSize: 13,
    pointerEvents: 'none'
  }
}), /*#__PURE__*/React.createElement("input", _extends({
  type: type,
  value: value,
  onChange: onChange,
  placeholder: placeholder,
  style: {
    width: '100%',
    height: 36,
    background: '#1A1B22',
    border: '1px solid #3E3F47',
    borderRadius: 6,
    padding: icon ? '0 12px 0 32px' : '0 12px',
    fontFamily: 'Inter, sans-serif',
    fontSize: 14,
    color: '#F2F3F7',
    outline: 'none',
    transition: 'border-color .15s, box-shadow .15s'
  },
  onFocus: e => {
    e.target.style.borderColor = '#1F6FEB';
    e.target.style.boxShadow = '0 0 0 3px rgba(31,111,235,0.32)';
  },
  onBlur: e => {
    e.target.style.borderColor = '#3E3F47';
    e.target.style.boxShadow = 'none';
  }
}, rest)));
const Badge = ({
  tone = 'blue',
  dot,
  children,
  style
}) => {
  const tones = {
    blue: {
      bg: 'rgba(31,111,235,0.15)',
      fg: '#4F95FF'
    },
    green: {
      bg: 'rgba(62,162,81,0.16)',
      fg: '#3EA251'
    },
    amber: {
      bg: 'rgba(203,143,9,0.16)',
      fg: '#CB8F09'
    },
    red: {
      bg: 'rgba(218,54,51,0.15)',
      fg: '#F85149'
    },
    purple: {
      bg: 'rgba(138,56,245,0.15)',
      fg: '#A77BF8'
    },
    grey: {
      bg: '#28292F',
      fg: '#ADAFB7'
    },
    solid: {
      bg: '#1F6FEB',
      fg: '#fff'
    }
  };
  const t = tones[tone] || tones.blue;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '2px 8px',
      borderRadius: 9999,
      background: t.bg,
      color: t.fg,
      fontFamily: 'Inter, sans-serif',
      fontSize: 11,
      fontWeight: 500,
      lineHeight: 1.4,
      ...style
    }
  }, dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: 9999,
      background: 'currentColor'
    }
  }), children);
};
const Card = ({
  children,
  style,
  padding = 16
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#1A1B22',
    border: '1px solid #28292F',
    borderRadius: 8,
    padding,
    ...style
  }
}, children);
const Avatar = ({
  initials,
  src,
  size = 32,
  style
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    width: size,
    height: size,
    borderRadius: 9999,
    background: 'linear-gradient(135deg, #8A38F5, #1F6FEB)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: size <= 24 ? 10 : size <= 32 ? 12 : 14,
    overflow: 'hidden',
    flexShrink: 0,
    ...style
  }
}, src ? /*#__PURE__*/React.createElement("img", {
  src: src,
  alt: "",
  style: {
    width: '100%',
    height: '100%'
  }
}) : initials);
const Switch = ({
  on,
  onChange
}) => /*#__PURE__*/React.createElement("button", {
  onClick: () => onChange(!on),
  style: {
    width: 32,
    height: 18,
    borderRadius: 9999,
    background: on ? '#1F6FEB' : '#3E3F47',
    position: 'relative',
    border: 'none',
    cursor: 'pointer',
    transition: 'background .15s'
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    position: 'absolute',
    top: 2,
    left: on ? 16 : 2,
    width: 14,
    height: 14,
    borderRadius: 9999,
    background: '#fff',
    transition: 'left .15s'
  }
}));
const Checkbox = ({
  on,
  onChange
}) => /*#__PURE__*/React.createElement("button", {
  onClick: () => onChange(!on),
  style: {
    width: 16,
    height: 16,
    borderRadius: 4,
    background: on ? '#1F6FEB' : 'transparent',
    border: `1px solid ${on ? '#1F6FEB' : '#5C5D64'}`,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 9,
    padding: 0
  }
}, on && /*#__PURE__*/React.createElement("i", {
  className: "fa-solid fa-check"
}));
const WLogo = ({
  size = 32
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    width: size,
    height: size,
    borderRadius: 9999,
    background: '#1A1B22',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  }
}, /*#__PURE__*/React.createElement("img", {
  src: "../../assets/logos/w-mark.svg",
  alt: "W",
  style: {
    width: size * 0.52,
    height: size * 0.4
  }
}));
Object.assign(window, {
  Button,
  IconButton,
  Input,
  Badge,
  Card,
  Avatar,
  Switch,
  Checkbox,
  WLogo
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/springboard/ui.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Accordion = __ds_scope.Accordion;

__ds_ns.Alert = __ds_scope.Alert;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Breadcrumb = __ds_scope.Breadcrumb;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Progress = __ds_scope.Progress;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Skeleton = __ds_scope.Skeleton;

__ds_ns.Spinner = __ds_scope.Spinner;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

})();
