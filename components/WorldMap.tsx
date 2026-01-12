'use client';

import { useEffect, useRef, useState } from 'react';

interface Marker {
  id: string;
  label: string;
  color?: string;
}

// Define markers for different regions
const regionMarkers: Record<string, Marker> = {
  US: { id: 'US', label: 'United States', color: '#3b82f6' },
  CA: { id: 'CA', label: 'Canada', color: '#22c55e' },
  BR: { id: 'BR', label: 'Brazil', color: '#eab308' },
  GB: { id: 'GB', label: 'United Kingdom', color: '#ef4444' },
  FR: { id: 'FR', label: 'France', color: '#8b5cf6' },
  DE: { id: 'DE', label: 'Germany', color: '#f97316' },
  IN: { id: 'IN', label: 'India', color: '#06b6d4' },
  CN: { id: 'CN', label: 'China', color: '#ec4899' },
  AU: { id: 'AU', label: 'Australia', color: '#14b8a6' },
  JP: { id: 'JP', label: 'Japan', color: '#f43f5e' },
  RU: { id: 'RU', label: 'Russia', color: '#6366f1' },
};

export default function WorldMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1009.6727, height: 665.96301 });
  const [isZoomed, setIsZoomed] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const animationRef = useRef<number | null>(null);

  // Original viewBox dimensions from the SVG
  const originalViewBox = { x: 0, y: 0, width: 1009.6727, height: 665.96301 };

  useEffect(() => {
    fetch('/svg/world-map.svg')
      .then(res => res.text())
      .then(svgText => {
        if (!containerRef.current) return;

        containerRef.current.innerHTML = svgText;
        const svg = containerRef.current.querySelector('svg');
        if (!svg) return;

        svgRef.current = svg;

        // Set initial viewBox
        svg.setAttribute('viewBox', `${originalViewBox.x} ${originalViewBox.y} ${originalViewBox.width} ${originalViewBox.height}`);
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

        // Add click handlers to all paths (regions)
        svg.querySelectorAll('path').forEach(path => {
          path.style.cursor = 'pointer';
          path.style.transition = 'fill 0.2s ease';

          path.addEventListener('click', (e) => {
            e.stopPropagation();
            const regionId = path.getAttribute('id') || '';
            handleRegionClick(path, regionId);
          });

          path.addEventListener('mouseenter', () => {
            if (!isZoomed || path.getAttribute('id') !== selectedRegion) {
              path.style.fill = '#4f83ff';
            }
          });

          path.addEventListener('mouseleave', () => {
            if (!isZoomed || path.getAttribute('id') !== selectedRegion) {
              path.style.fill = '';
            }
          });
        });

        // Click on background to reset
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
  }, []);

  const handleRegionClick = (path: SVGPathElement, regionId: string) => {
    const bbox = path.getBBox();
    
    // Calculate zoom level based on region size
    const padding = 20;
    const targetWidth = bbox.width + padding * 2;
    const targetHeight = bbox.height + padding * 2;
    
    // Determine zoom to fit the region nicely (with some context)
    const zoomX = originalViewBox.width / targetWidth;
    const zoomY = originalViewBox.height / targetHeight;
    const zoom = Math.min(zoomX, zoomY, 8); // Cap at 8x zoom
    
    const newWidth = originalViewBox.width / zoom;
    const newHeight = originalViewBox.height / zoom;
    
    // Center on the clicked region
    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;
    
    const newX = centerX - newWidth / 2;
    const newY = centerY - newHeight / 2;

    animateViewBox(
      { ...viewBox },
      { x: newX, y: newY, width: newWidth, height: newHeight },
      800
    );

    setIsZoomed(true);
    setSelectedRegion(regionId);

    // Highlight the selected region
    if (svgRef.current) {
      svgRef.current.querySelectorAll('path').forEach(p => {
        p.style.fill = '';
      });
      path.style.fill = regionMarkers[regionId]?.color || '#4f83ff';
    }
  };

  const resetZoom = () => {
    animateViewBox(
      { ...viewBox },
      { ...originalViewBox },
      600
    );
    setIsZoomed(false);
    setSelectedRegion(null);

    // Reset all fills
    if (svgRef.current) {
      svgRef.current.querySelectorAll('path').forEach(p => {
        p.style.fill = '';
      });
    }
  };

  const animateViewBox = (
    from: typeof viewBox,
    to: typeof viewBox,
    duration: number
  ) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);

      const current = {
        x: from.x + (to.x - from.x) * eased,
        y: from.y + (to.y - from.y) * eased,
        width: from.width + (to.width - from.width) * eased,
        height: from.height + (to.height - from.height) * eased,
      };

      if (svgRef.current) {
        svgRef.current.setAttribute('viewBox', `${current.x} ${current.y} ${current.width} ${current.height}`);
      }
      setViewBox(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className="map-container">
      <div ref={containerRef} className="map-svg" />
      {selectedRegion && regionMarkers[selectedRegion] && (
        <div className="region-info">
          <span 
            className="marker-dot" 
            style={{ backgroundColor: regionMarkers[selectedRegion].color }}
          />
          {regionMarkers[selectedRegion].label}
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
