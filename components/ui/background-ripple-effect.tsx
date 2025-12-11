"use client";
import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const BackgroundRippleEffect = ({
  rows = 55,
  cols = 35,
  cellSize = 60,
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
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Colors - Updated to match Founder Flow brand theme (Wisteria/Oxford Blue)
    const colors = {
      border: "rgba(255, 255, 255, 0.05)", // Subtle white border
      fill: "rgba(2, 2, 10, 0.5)", // Dark brand background with opacity
      hover: "rgba(180, 151, 214, 0.1)", // Wisteria hover
      ripple: "rgba(180, 151, 214, 0.2)", // Wisteria ripple
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
            const delay = distance * 30; // Propagation speed
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
            // Mix ripple color (Wisteria)
            ctx.fillStyle = `rgba(180, 151, 214, ${0.1 + rippleIntensity * 0.3})`;
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

      // Clean up old ripples that have finished
      const currentTime = performance.now();
      ripplesRef.current = ripplesRef.current.filter(ripple => {
        const elapsed = currentTime - ripple.startTime;
        const maxDuration = 5000; // Keep ripples for max 5 seconds
        return elapsed < maxDuration;
      });

      // Throttle to 24fps instead of 60fps for performance
      setTimeout(() => {
        animationFrameRef.current = requestAnimationFrame(render);
      }, 1000 / 24); // 24fps
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

