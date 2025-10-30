# Rainbow Laser Pointer

An interactive canvas-based laser pointer application with smooth trail rendering and color transitions. Built with React, TypeScript, and HTML5 Canvas API.

## Technical Overview

### Rendering Architecture

The application uses a single `<canvas>` element with continuous `requestAnimationFrame` rendering. All trails are stored in memory as structured data and drawn frame-by-frame with per-pixel alpha fading for smooth dissolution.

### Curve Smoothing

Implements **Catmull-Rom spline interpolation** for curve generation. Each segment between captured points is subdivided into 8 interpolated sub-segments, creating smooth curves that pass through all control points while maintaining C¹ continuity. The interpolation function operates on position, color, and alpha values simultaneously.

```typescript
// Catmull-Rom interpolation with 8 sub-segments per curve segment
const catmullRom = (t: number, p0: number, p1: number, p2: number, p3: number): number => {
  const v0 = (p2 - p0) * 0.5;
  const v1 = (p3 - p1) * 0.5;
  return (2 * p1 - 2 * p2 + v0 + v1) * t³ + (-3 * p1 + 3 * p2 - 2 * v0 - v1) * t² + v0 * t + p1;
}
```

### Performance Optimizations

- **Point density control**: Minimum 2px distance threshold reduces noise and computational overhead
- **Trail length limiting**: Hard cap at 150 points with circular buffer behavior to prevent memory growth
- **Efficient cleanup**: Faded points filtered using functional array methods, fully transparent trails removed each frame
- **Single render loop**: All trails processed in a single animation frame callback

### Color System

Each trail maintains a base hue assigned at creation time. Color transitions occur linearly across 60° of the HSL color space as the trail grows. Individual points store their own hue value, enabling smooth gradient rendering between interpolated points using Canvas `createLinearGradient`.

### Input Handling

Supports both mouse and touch events through unified event handlers. Position extraction uses type guards (`'touches' in e`) for TypeScript safety. Drawing state managed via `useRef` to avoid unnecessary re-renders.

### Type Safety

Full TypeScript coverage with strict interfaces for trail data structures. Refs properly typed (`HTMLCanvasElement`, array types) and null checks for canvas/context access. Event handlers use union types for mouse/touch event compatibility.

## Development

```bash
yarn dev      # Start development server
yarn build    # Production build
yarn lint     # Run ESLint
```

## Technology Stack

- React 19
- TypeScript 5.7
- Vite 6
- HTML5 Canvas API