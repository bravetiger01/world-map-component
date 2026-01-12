'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface Marker {
  regionId: string;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  x: number;
  y: number;
}

const markers: Marker[] = [
  { regionId: 'US', label: 'United States', icon: 'US', color: '#fff', bgColor: '#1e3a5f', x: 180, y: 320 },
  { regionId: 'CA', label: 'Canada', icon: 'CA', color: '#fff', bgColor: '#7c2d12', x: 200, y: 220 },
  { regionId: 'BR', label: 'Brazil', icon: 'BR', color: '#fff', bgColor: '#166534', x: 330, y: 470 },
  { regionId: 'GB', label: 'United Kingdom', icon: 'GB', color: '#fff', bgColor: '#7c3aed', x: 468, y: 280 },
  { regionId: 'FR', label: 'France', icon: 'FR', color: '#fff', bgColor: '#1d4ed8', x: 480, y: 315 },
  { regionId: 'DE', label: 'Germany', icon: 'DE', color: '#fff', bgColor: '#374151', x: 505, y: 295 },
  { regionId: 'IN', label: 'India', icon: 'IN', color: '#fff', bgColor: '#c2410c', x: 700, y: 390 },
  { regionId: 'CN', label: 'China', icon: 'CN', color: '#fff', bgColor: '#b91c1c', x: 770, y: 340 },
  { regionId: 'AU', label: 'Australia', icon: 'AU', color: '#fff', bgColor: '#0369a1', x: 870, y: 510 },
  { regionId: 'JP', label: 'Japan', icon: 'JP', color: '#fff', bgColor: '#be123c', x: 870, y: 320 },
  { regionId: 'RU', label: 'Russia', icon: 'RU', color: '#fff', bgColor: '#4338ca', x: 700, y: 220 },
];

const originalViewBox = { x: 0, y: 0, width: 1009.6727, height: 665.96301 };

export default function WorldMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const currentViewBoxRef = useRef({ ...originalViewBox });
  const selectedRegionRef = useRef<string | null>(null);
  const animationRef = useRef<number | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const animateViewBox = useCallback((to: typeof originalViewBox, duration: number) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const from = { ...currentViewBoxRef.current };
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      const current = {
        x: from.x + (to.x - from.x) * eased,
        y: from.y + (to.y - from.y) * eased,
        width: from.width + (to.width - from.width) * eased,
        height: from.height + (to.height - from.height) * eased,
      };

      currentViewBoxRef.current = current;

      if (svgRef.current) {
        svgRef.current.setAttribute('viewBox', `${current.x} ${current.y} ${current.width} ${current.height}`);
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, []);

  const zoomToRegion = useCallback((regionId: string) => {
    // Use ref to check current selection (avoids stale closure)
    if (!svgRef.current || regionId === selectedRegionRef.current) return;
    
    const path = svgRef.current.querySelector(`path#${regionId}`) as SVGPathElement;
    if (!path) {
      console.log('Path not found for:', regionId);
      return;
    }

    const bbox = path.getBBox();
    
    // For large countries, use a minimum zoom level
    const minZoom = 1.5;
    
    // Calculate zoom based on region size
    const padding = Math.max(bbox.width, bbox.height) * 0.3;
    const targetWidth = bbox.width + padding * 2;
    const targetHeight = bbox.height + padding * 2;
    
    const zoomX = originalViewBox.width / targetWidth;
    const zoomY = originalViewBox.height / targetHeight;
    
    // Ensure at least minZoom, cap at 6
    const zoom = Math.max(minZoom, Math.min(zoomX, zoomY, 6));
    
    let newWidth = originalViewBox.width / zoom;
    let newHeight = originalViewBox.height / zoom;
    
    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;
    
    let newX = centerX - newWidth / 2;
    let newY = centerY - newHeight / 2;

    // Constrain to map bounds
    newX = Math.max(0, Math.min(newX, originalViewBox.width - newWidth));
    newY = Math.max(0, Math.min(newY, originalViewBox.height - newHeight));

    // Ensure dimensions don't exceed original
    newWidth = Math.min(newWidth, originalViewBox.width);
    newHeight = Math.min(newHeight, originalViewBox.height);

    animateViewBox({ x: newX, y: newY, width: newWidth, height: newHeight }, 800);

    // Update both ref and state
    selectedRegionRef.current = regionId;
    setIsZoomed(true);
    setSelectedRegion(regionId);

    // Update highlighting
    svgRef.current.querySelectorAll('path').forEach(p => {
      p.style.fill = '';
    });
    const marker = markers.find(m => m.regionId === regionId);
    path.style.fill = marker?.bgColor || '#4f83ff';
  }, [animateViewBox]);

  const resetZoom = useCallback(() => {
    animateViewBox({ ...originalViewBox }, 600);
    selectedRegionRef.current = null;
    setIsZoomed(false);
    setSelectedRegion(null);

    if (svgRef.current) {
      svgRef.current.querySelectorAll('path').forEach(p => {
        p.style.fill = '';
      });
    }
  }, [animateViewBox]);

  useEffect(() => {
    fetch('/svg/world-map.svg')
      .then(res => res.text())
      .then(svgText => {
        if (!containerRef.current) return;

        containerRef.current.innerHTML = svgText;
        const svg = containerRef.current.querySelector('svg');
        if (!svg) return;

        svgRef.current = svg;
        svg.setAttribute('viewBox', `${originalViewBox.x} ${originalViewBox.y} ${originalViewBox.width} ${originalViewBox.height}`);
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        currentViewBoxRef.current = { ...originalViewBox };

        // Create markers group
        const markersGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        markersGroup.setAttribute('class', 'markers-group');
        svg.appendChild(markersGroup);

        // Add markers
        markers.forEach(marker => {
          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          g.setAttribute('class', 'map-marker');
          g.setAttribute('data-region', marker.regionId);
          g.style.cursor = 'pointer';

          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', String(marker.x));
          circle.setAttribute('cy', String(marker.y));
          circle.setAttribute('r', '12');
          circle.setAttribute('fill', marker.bgColor);
          circle.setAttribute('stroke', '#fff');
          circle.setAttribute('stroke-width', '1.5');

          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', String(marker.x));
          text.setAttribute('y', String(marker.y + 3));
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('font-size', '8');
          text.setAttribute('fill', '#fff');
          text.setAttribute('font-weight', 'bold');
          text.textContent = marker.icon;

          g.appendChild(circle);
          g.appendChild(text);
          markersGroup.appendChild(g);

          g.addEventListener('click', (e) => {
            e.stopPropagation();
            zoomToRegion(marker.regionId);
          });
        });

        // Path click handlers
        svg.querySelectorAll('path').forEach(path => {
          path.style.cursor = 'pointer';
          path.style.transition = 'fill 0.2s ease';

          path.addEventListener('click', (e) => {
            e.stopPropagation();
            const regionId = path.getAttribute('id') || '';
            zoomToRegion(regionId);
          });

          path.addEventListener('mouseenter', () => {
            const regionId = path.getAttribute('id') || '';
            if (regionId !== selectedRegionRef.current) {
              path.style.fill = '#4f83ff';
            }
          });

          path.addEventListener('mouseleave', () => {
            const regionId = path.getAttribute('id') || '';
            if (regionId !== selectedRegionRef.current) {
              path.style.fill = '';
            }
          });
        });

        // Background click to reset
        svg.addEventListener('click', (e) => {
          if (e.target === svg) {
            resetZoom();
          }
        });
      });

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [zoomToRegion, resetZoom]);

  useEffect(() => {
    if (!svgRef.current) return;
    
    svgRef.current.querySelectorAll('path').forEach(path => {
      const regionId = path.getAttribute('id') || '';
      path.style.cursor = regionId === selectedRegion ? 'default' : 'pointer';
    });
  }, [selectedRegion]);

  const currentMarker = markers.find(m => m.regionId === selectedRegion);

  return (
    <div className="map-container">
      <div ref={containerRef} className="map-svg" />

      {selectedRegion && currentMarker && (
        <div className="region-banner" key={selectedRegion}>
          <span className="banner-text">{currentMarker.label}</span>
        </div>
      )}

      {isZoomed && (
        <button className="reset-btn" onClick={resetZoom}>
          Reset View
        </button>
      )}
    </div>
  );
}
