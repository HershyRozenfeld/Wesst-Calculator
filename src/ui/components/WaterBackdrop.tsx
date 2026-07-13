import { useEffect, useRef } from 'react';

const FRAME_INTERVAL = 1000 / 24;
const MAX_CANVAS_PIXELS = 3_000_000;

export function WaterBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext('2d');
    if (!context) return undefined;
    const canvasElement: HTMLCanvasElement = canvas;
    const drawingContext: CanvasRenderingContext2D = context;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animationFrame = 0;
    let lastFrame = 0;
    let width = 0;
    let height = 0;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      const areaLimit = Math.sqrt(MAX_CANVAS_PIXELS / Math.max(1, width * height));
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25, areaLimit);
      canvasElement.width = Math.round(width * pixelRatio);
      canvasElement.height = Math.round(height * pixelRatio);
      canvasElement.style.width = `${width}px`;
      canvasElement.style.height = `${height}px`;
      drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      if (reducedMotion.matches) draw(0);
    }

    function drawWave(
      baseY: number,
      amplitude: number,
      wavelength: number,
      lineWidth: number,
      color: string,
      phase: number,
    ) {
      drawingContext.beginPath();
      for (let x = -24; x <= width + 24; x += 12) {
        const y = baseY
          + Math.sin(x / wavelength + phase) * amplitude
          + Math.sin(x / (wavelength * 0.47) - phase * 0.62) * amplitude * 0.22;
        if (x === -24) drawingContext.moveTo(x, y);
        else drawingContext.lineTo(x, y);
      }
      drawingContext.strokeStyle = color;
      drawingContext.lineWidth = lineWidth;
      drawingContext.lineCap = 'round';
      drawingContext.stroke();
    }

    function draw(timestamp: number) {
      drawingContext.clearRect(0, 0, width, height);
      drawingContext.fillStyle = '#f4fafb';
      drawingContext.fillRect(0, 0, width, height);

      const time = reducedMotion.matches ? 0 : timestamp * 0.00012;
      const spacing = Math.max(84, height / 7);

      for (let index = -1; index < 9; index += 1) {
        const baseY = spacing * index + Math.sin(time * 0.7 + index) * 14;
        drawWave(baseY, 18, 148, 24, 'rgba(126, 195, 207, 0.055)', time + index * 0.78);
        drawWave(baseY + 10, 13, 174, 1.25, 'rgba(53, 132, 151, 0.14)', time * 0.82 + index);
        drawWave(baseY + 28, 9, 112, 1, 'rgba(255, 255, 255, 0.78)', -time * 0.58 + index * 0.66);
      }

      // Long crossing highlights keep the texture closer to moving water than stripes.
      drawingContext.save();
      drawingContext.translate(width * 0.5, height * 0.5);
      drawingContext.rotate(-0.16);
      drawingContext.translate(-width * 0.5, -height * 0.5);
      for (let index = 0; index < 4; index += 1) {
        drawWave(
          height * (0.16 + index * 0.27),
          26,
          230,
          2,
          'rgba(96, 175, 188, 0.075)',
          -time * 0.46 + index * 1.4,
        );
      }
      drawingContext.restore();
    }

    function animate(timestamp: number) {
      if (timestamp - lastFrame >= FRAME_INTERVAL) {
        draw(timestamp);
        lastFrame = timestamp;
      }
      animationFrame = window.requestAnimationFrame(animate);
    }

    function start() {
      window.cancelAnimationFrame(animationFrame);
      if (document.hidden || reducedMotion.matches) {
        draw(0);
        return;
      }
      animationFrame = window.requestAnimationFrame(animate);
    }

    resize();
    start();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', start);
    reducedMotion.addEventListener('change', start);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', start);
      reducedMotion.removeEventListener('change', start);
    };
  }, []);

  return <canvas ref={canvasRef} className="water-backdrop" aria-hidden="true" />;
}
