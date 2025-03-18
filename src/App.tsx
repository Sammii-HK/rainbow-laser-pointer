import React, { useEffect, useRef } from "react";

const NeonLaserTrail = () => {
  const canvasRef = useRef(null);
  const trailsRef = useRef([]); // Store all trails
  const drawingRef = useRef(false); // Whether the user is drawing
  let hue = 0; // Hue for smooth gradient transitions

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
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

      requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
    return () => cancelAnimationFrame(render);
  }, []);

  const getMousePos = (e) => ({
    x: e.touches ? e.touches[0].clientX : e.clientX,
    y: e.touches ? e.touches[0].clientY : e.clientY,
  });

  const startDrawing = (e) => {
    drawingRef.current = true;
    const { x, y } = getMousePos(e);
    hue = (hue + 10) % 360;

    // Start a new trail immediately
    trailsRef.current.push([{ x, y, hue, alpha: 1 }]);
  };

  const stopDrawing = () => {
    drawingRef.current = false;
  };

  const addTrail = (e) => {
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
