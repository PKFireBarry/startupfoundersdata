"use client";
import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const BackgroundRippleEffect = ({
  rows = 100,
  cols = 40,
  cellSize = 56,
  className,
}: {
  rows?: number;
  cols?: number;
  cellSize?: number;
  className?: string;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);
  const ripplesRef = useRef<Array<{ row: number; col: number; startTime: number }>>([]);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Colors - hardcoded to match the dark theme visuals
    // Using the values that were previously CSS variables
    const colors = {
      border: "rgba(63, 63, 70, 0.4)", // neutral-700 with opacity
      fill: "rgba(24, 24, 27, 0.6)", // neutral-900 with opacity
      hover: "rgba(39, 39, 42, 0.8)", // neutral-800
      ripple: "rgba(56, 189, 248, 0.15)", // sky-400 equivalent with low opacity for ripple
    };

    const render = () => {
      if (!canvas || !ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const now = performance.now();

      // Remove old ripples
      ripplesRef.current = ripplesRef.current.filter(
        (ripple) => now - ripple.startTime < 2000 // Keep ripples for 2 seconds max
      );

      // Draw grid
      // We draw only visible cells to optimize, but since we want the whole grid...
      // Actually, iterating 4000 items is fine.

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * cellSize;
          const y = r * cellSize;

          // Base state
          let fillStyle = colors.fill;
          let isHovered = false;

          // Hover effect
          if (hoverCell && hoverCell.row === r && hoverCell.col === c) {
            fillStyle = colors.hover;
            isHovered = true;
          }

          // Ripple effect
          let rippleIntensity = 0;
          ripplesRef.current.forEach((ripple) => {
            const distance = Math.hypot(r - ripple.row, c - ripple.col);
            const elapsed = now - ripple.startTime;

            // Wave logic
            const delay = distance * 40; // Propagation speed
            const duration = 400; // Duration of the flash for each cell

            if (elapsed > delay && elapsed < delay + duration) {
              // Fade in and out
              const progress = (elapsed - delay) / duration;
              const intensity = Math.sin(progress * Math.PI); // 0 -> 1 -> 0
              rippleIntensity = Math.max(rippleIntensity, intensity);
            }
          });

          // Draw cell background
          ctx.beginPath();
          ctx.rect(x, y, cellSize, cellSize);

          if (rippleIntensity > 0) {
            // Mix ripple color
            // Simple additive blending simulation
            ctx.fillStyle = `rgba(56, 189, 248, ${0.1 + rippleIntensity * 0.2})`;
          } else {
            ctx.fillStyle = fillStyle;
          }
          ctx.fill();

          // Draw borders
          ctx.strokeStyle = colors.border;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    const handleResize = () => {
      // Set canvas size to match container
      // We want high DPI rendering
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();

      // Ensure we cover the requested rows/cols
      const targetWidth = Math.max(rect.width, cols * cellSize);
      const targetHeight = Math.max(rect.height, rows * cellSize);

      canvas.width = targetWidth * dpr;
      canvas.height = targetHeight * dpr;

      canvas.style.width = `${targetWidth}px`;
      canvas.style.height = `${targetHeight}px`;

      ctx.scale(dpr, dpr);
    };

    window.addEventListener("resize", handleResize);
    handleResize();
    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [rows, cols, cellSize, hoverCell]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left + (containerRef.current?.scrollLeft || 0);
    const y = e.clientY - rect.top + (containerRef.current?.scrollTop || 0);

    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);

    setHoverCell({ row, col });
  };

  const handleMouseLeave = () => {
    setHoverCell(null);
  };

  const handleClick = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left + (containerRef.current?.scrollLeft || 0);
    const y = e.clientY - rect.top + (containerRef.current?.scrollTop || 0);

    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);

    ripplesRef.current.push({
      row,
      col,
      startTime: performance.now(),
    });
  };

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 overflow-hidden", className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <canvas
        ref={canvasRef}
        className="block"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
};

