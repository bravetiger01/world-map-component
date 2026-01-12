'use client';

import { useEffect, useRef } from 'react';

export default function WorldMap() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/svg/world-map.svg')
      .then((res) => res.text())
      .then((svgText) => {
        if (!containerRef.current) return;

        containerRef.current.innerHTML = svgText;

        const svg = containerRef.current.querySelector('svg');
        if (!svg) return;

        // Make SVG responsive
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');

        // OPTIONAL: remove inline fills if present
        svg.querySelectorAll('[fill]').forEach((el) => {
          el.removeAttribute('fill');
        });
      });
  }, []);

  return (
    <div
      ref={containerRef}
      className="world-map-container w-full h-auto"
    />
  );
}
