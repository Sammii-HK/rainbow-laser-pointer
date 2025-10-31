import React, { useEffect, useRef } from "react";

// Define the interface for trail points
interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  hue: number; // Restore hue per point for color transitions
}

// Define the interface for trails with base color
interface Trail {
  points: TrailPoint[];
  baseHue: number; // Base hue for the trail
  cumulativeDistance: number; // Track distance traveled for color phasing
  lastPoint: { x: number; y: number } | null; // Track last point per trail
  lastUpdateTime: number;
  trailId: number; // Unique ID for each trail
}

const NeonLaserTrail = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailsRef = useRef<Trail[]>([]); // Store all trails
  const animationIdRef = useRef<number | null>(null); // Store animation frame ID
  const hueRef = useRef<number>(0); // Use ref for hue to persist across renders
  const activeTrailsMap = useRef<Map<number, number>>(new Map()); // Map pointerId -> trailId for active drawings
  const activeMouseTrailRef = useRef<number | null>(null); // Track the currently active mouse trail ID
  const trailIdCounterRef = useRef<number>(0); // Unique ID counter for each trail
  const isDrawingRef = useRef<boolean>(false); // Track if we're currently drawing

  // Performance constants
  const MIN_DISTANCE = 1; // Very close dots for smooth lines
  const FADE_SPEED = 0.006; // Slower fade for longer trails
  const COLOR_PHASE_DISTANCE = 800; // Distance (in pixels) for full color cycle

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return; // Handle null canvas case
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return; // Handle null context case
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Catmull-Rom spline interpolation function
    const catmullRom = (t: number, p0: number, p1: number, p2: number, p3: number): number => {
      const v0 = (p2 - p0) * 0.5;
      const v1 = (p3 - p1) * 0.5;
      const t2 = t * t;
      const t3 = t * t2;
      return (2 * p1 - 2 * p2 + v0 + v1) * t3 + (-3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;
    };

    // Get interpolated point using Catmull-Rom spline
    // Don't interpolate alpha to avoid bright dot artifacts
    const getInterpolatedPoint = (points: TrailPoint[], i: number, t: number) => {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[Math.min(points.length - 1, i + 1)];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      // Linear interpolation for alpha (smoother, avoids artifacts)
      const alpha = p1.alpha + (p2.alpha - p1.alpha) * t;

      return {
        x: catmullRom(t, p0.x, p1.x, p2.x, p3.x),
        y: catmullRom(t, p0.y, p1.y, p2.y, p3.y),
        hue: catmullRom(t, p0.hue, p1.hue, p2.hue, p3.hue),
        alpha: Math.max(0, Math.min(1, alpha)) // Clamp alpha to valid range
      };
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Loop through all trails
      trailsRef.current.forEach((trail) => {
        const points = trail.points;
        if (points.length < 2) return;

        // Fade all points in the trail
        points.forEach(point => {
          point.alpha = Math.max(point.alpha - FADE_SPEED, 0);
        });

        // Draw ultra-smooth curves using Catmull-Rom splines
        if (points.length >= 2) {
          for (let i = 0; i < points.length - 1; i++) {
            const current = points[i];
            if (current.alpha <= 0) continue;

            const segmentSteps = 8; // Number of steps per segment
            
            for (let step = 0; step < segmentSteps; step++) {
              const t = step / segmentSteps;
              const nextT = (step + 1) / segmentSteps;
              
              const startPoint = getInterpolatedPoint(points, i, t);
              const endPoint = getInterpolatedPoint(points, i, nextT);
              
              if (startPoint.alpha <= 0 || endPoint.alpha <= 0) continue;

              // Use consistent alpha and line width to avoid bright dots
              const avgAlpha = (startPoint.alpha + endPoint.alpha) / 2;
              
              // Create gradient for smooth color transitions (but use consistent alpha)
              const gradient = ctx.createLinearGradient(
                startPoint.x, startPoint.y, endPoint.x, endPoint.y
              );
              
              gradient.addColorStop(0, `hsla(${startPoint.hue}, 100%, 70%, ${avgAlpha})`);
              gradient.addColorStop(1, `hsla(${endPoint.hue}, 100%, 70%, ${avgAlpha})`);

              // Draw the smooth segment with consistent width
              ctx.strokeStyle = gradient;
              ctx.lineWidth = 4; // Fixed width to avoid bright spots
              ctx.lineCap = "round";
              ctx.lineJoin = "round";

              ctx.beginPath();
              ctx.moveTo(startPoint.x, startPoint.y);
              ctx.lineTo(endPoint.x, endPoint.y);
              ctx.stroke();
            }
          }
        }
      });

      // Remove fully faded trails and limit trail lengths
      trailsRef.current = trailsRef.current
        .map(trail => ({
          ...trail,
          points: trail.points.filter(point => point.alpha > 0)
        }))
        .filter(trail => trail.points.length > 1);

      animationIdRef.current = requestAnimationFrame(render);
    };

    animationIdRef.current = requestAnimationFrame(render);
    
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []);

  // Get position from mouse or touch event
  const getPos = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    if ('touches' in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    const mouseEvent = e as React.MouseEvent;
    return { x: mouseEvent.clientX, y: mouseEvent.clientY };
  };

  const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  };

  // Helper to find trail by ID
  const findTrailById = (trailId: number): Trail | undefined => {
    return trailsRef.current.find(trail => trail.trailId === trailId);
  };

  // Handle mouse/touch start - always creates a new trail with unique ID
  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    
    const { x, y } = getPos(e);
    
    // Generate a new base hue for this trail
    const baseHue = (hueRef.current + 30) % 360;
    hueRef.current = baseHue;
    
    // Generate unique trail ID
    const trailId = trailIdCounterRef.current++;
    
    // Always start a NEW trail with unique ID - completely independent
    // No state checks - just create the trail
    // Add two points initially (same position) so the line is visible immediately
    const newTrail: Trail = {
      points: [
        { x, y, alpha: 1, hue: baseHue },
        { x, y, alpha: 1, hue: baseHue } // Second point at same position for immediate visibility
      ],
      baseHue: baseHue,
      cumulativeDistance: 0,
      lastPoint: { x, y },
      lastUpdateTime: Date.now(),
      trailId: trailId
    };
    
    // Add to trails array immediately
    trailsRef.current.push(newTrail);
    
    // Map pointer identifier to this trail's unique ID
    if ('touches' in e && e.touches.length > 0) {
      // Touch event - use touch identifier
      const identifier = e.touches[0].identifier;
      activeTrailsMap.current.set(identifier, trailId);
    } else {
      // Mouse event - track as the active mouse trail
      activeMouseTrailRef.current = trailId;
    }
    
    // Always set drawing state for this trail
    isDrawingRef.current = true;
  };

  // Handle mouse/touch move - updates the trail for this specific pointer
  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    // Get the trail ID for this pointer first - don't check isDrawingRef
    let trailId: number | undefined;
    
    if ('touches' in e && e.touches.length > 0) {
      // Touch event - use touch identifier
      const identifier = e.touches[0]?.identifier;
      if (identifier !== undefined) {
        trailId = activeTrailsMap.current.get(identifier);
      }
    } else {
      // Mouse event - use the active mouse trail
      trailId = activeMouseTrailRef.current ?? undefined;
    }
    
    // If no active trail for this pointer, ignore the move
    if (trailId === undefined) return;
    
    const currentTrail = findTrailById(trailId);
    if (!currentTrail) {
      // Trail was removed, clean up all references to this trailId
      for (const [key, value] of activeTrailsMap.current.entries()) {
        if (value === trailId) {
          activeTrailsMap.current.delete(key);
        }
      }
      if (activeTrailsMap.current.size === 0) {
        isDrawingRef.current = false;
      }
      return;
    }
    
    const { x, y } = getPos(e);
    
    // Only add point if it's far enough from the last point
    if (currentTrail.lastPoint && getDistance({ x, y }, currentTrail.lastPoint) < MIN_DISTANCE) {
      return;
    }
    
    // Calculate distance traveled
    const distanceTraveled = currentTrail.lastPoint 
      ? getDistance({ x, y }, currentTrail.lastPoint)
      : 0;
    currentTrail.cumulativeDistance += distanceTraveled;
    
    // NO LENGTH LIMIT - let trails grow as long as needed
    // This ensures each line can be as long as the user wants
    
    // Calculate color based on distance traveled
    const colorProgress = (currentTrail.cumulativeDistance % COLOR_PHASE_DISTANCE) / COLOR_PHASE_DISTANCE;
    const currentHue = (currentTrail.baseHue + (colorProgress * 360)) % 360;
    
    // Add new point to this independent trail
    currentTrail.points.push({ x, y, alpha: 1, hue: currentHue });
    currentTrail.lastPoint = { x, y };
  };

  // Handle mouse/touch end - clean up specific pointer's trail
  const handleEnd = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!e) {
      // No event (e.g., mouse leave) - clear active mouse trail
      activeMouseTrailRef.current = null;
    } else if ('changedTouches' in e) {
      // Touch events - clear specific touch identifiers
      for (let i = 0; i < e.changedTouches.length; i++) {
        activeTrailsMap.current.delete(e.changedTouches[i].identifier);
      }
    } else {
      // Mouse event - clear active mouse trail
      activeMouseTrailRef.current = null;
    }
    
    // Update drawing state - but don't let it block new trails
    if (activeTrailsMap.current.size === 0 && activeMouseTrailRef.current === null) {
      isDrawingRef.current = false;
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "#080808",
        cursor: "crosshair",
        touchAction: "none",
      }}
    />
  );
};

export default NeonLaserTrail;
