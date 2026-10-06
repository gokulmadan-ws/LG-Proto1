// src/charts/Hatch.jsx
// The texture channel: 45-degree ruled lines drawn as an SVG <pattern>, so the UI carries no CSS fill functions at all.
// Drop it inside any position:relative / absolute box; it fills the box. Colour-blind, print and forced-colors readers
// get "beyond the cap" / "no contract" from the pattern, not just the hue.
import { useId } from 'react';

export function Hatch({ color = 'var(--viz-danger)', period = 6, tint = 8 }) {
  const id = 'kh' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg className="kviz-hatch" aria-hidden="true" focusable="false" preserveAspectRatio="none">
      <defs>
        <pattern id={id} width={period} height={period} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={period} height={period} style={{ fill: `color-mix(in srgb, ${color} ${tint}%, var(--viz-surface))` }} />
          <rect width="2" height={period} style={{ fill: color }} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
