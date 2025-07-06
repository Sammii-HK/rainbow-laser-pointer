import React, { useEffect, useRef } from "react";

// Define the interface for trail points
interface TrailPoint {
  x: number;
  y: number;
  hue: number;
  alpha: number;
}

// Define the type for trails (array of trail points)
type Trail = TrailPoint[];

const NeonLaserTrail = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailsRef = useRef<Trail[]>([]); // Store all trails
  const drawingRef = useRef<boolean>(false); // Whether the user is drawing
  const animationIdRef = useRef<number | null>(null); // Store animation frame ID
  let hue = 0; // Hue for smooth gradient transitions

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return; // Handle null canvas case
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return; // Handle null context case
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Loop through all trails
      trailsRef.current.forEach((trail) => {
        for (let i = 0; i < trail.length - 1; i++) {
          const trailStart = trail[i];
          const trailEnd = trail[i + 1];

          // Gradually fade older trails
          trailStart.alpha = Math.max(trailStart.alpha - 0.01, 0);

          // Create a gradient for smoother blending
          const gradient = ctx.createLinearGradient(
            trailStart.x, trailStart.y, trailEnd.x, trailEnd.y
          );
          gradient.addColorStop(0, `hsla(${trailStart.hue}, 100%, 70%, ${trailStart.alpha})`);
          gradient.addColorStop(1, `hsla(${trailEnd.hue}, 100%, 70%, ${trailEnd.alpha})`);

          ctx.strokeStyle = gradient;
          ctx.lineWidth = 6;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";

          ctx.beginPath();
          ctx.moveTo(trailStart.x, trailStart.y);
          ctx.lineTo(trailEnd.x, trailEnd.y);
          ctx.stroke();
        }
      });

      // Remove fully faded trails
      trailsRef.current = trailsRef.current.map(trail => 
        trail.filter(point => point.alpha > 0)
      ).filter(trail => trail.length > 1);

      animationIdRef.current = requestAnimationFrame(render);
    };

    animationIdRef.current = requestAnimationFrame(render);
    
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []);

  const getMousePos = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => ({
    x: 'touches' in e ? e.touches[0].clientX : e.clientX,
    y: 'touches' in e ? e.touches[0].clientY : e.clientY,
  });

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    drawingRef.current = true;
    const { x, y } = getMousePos(e);
    hue = (hue + 10) % 360;

    // Start a new trail immediately
    trailsRef.current.push([{ x, y, hue, alpha: 1 }]);
  };

  const stopDrawing = () => {
    drawingRef.current = false;
  };

  const addTrail = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawingRef.current) return;
    const { x, y } = getMousePos(e);
    hue = (hue + 1) % 360;

    // Push to the most recent trail in real time
    if (trailsRef.current.length > 0) {
      trailsRef.current[trailsRef.current.length - 1].push({
        x, y, hue, alpha: 1,
      });
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing}
      onMouseUp={stopDrawing}
      onMouseMove={addTrail}
      onTouchStart={startDrawing}
      onTouchEnd={stopDrawing}
      onTouchMove={addTrail}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "#080808",
      }}
    />
  );
};

export default NeonLaserTrail;
