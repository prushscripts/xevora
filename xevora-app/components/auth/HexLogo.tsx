"use client";

import { useEffect, useRef } from "react";

type Point = { x: number; y: number };

const CENTER = 70;
const RADIUS = 52;
const SIZE = 140;

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function buildVertices(): Point[] {
  const vertices: Point[] = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    vertices.push({
      x: CENTER + RADIUS * Math.cos(angle),
      y: CENTER + RADIUS * Math.sin(angle),
    });
  }
  return vertices;
}

function getPerimeterPosition(vertices: Point[], t: number): Point {
  const edgeIndex = Math.floor(t * 6) % 6;
  const edgeProgress = (t * 6) % 1;
  const start = vertices[edgeIndex];
  const end = vertices[(edgeIndex + 1) % 6];
  return {
    x: lerp(start.x, end.x, edgeProgress),
    y: lerp(start.y, end.y, edgeProgress),
  };
}

export default function HexLogo() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const verticesRef = useRef<Point[]>(buildVertices());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const drawFrame = () => {
      context.clearRect(0, 0, SIZE, SIZE);
      const vertices = verticesRef.current;

      // subtle wider glow stroke under the main hex stroke
      context.beginPath();
      context.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i += 1) context.lineTo(vertices[i].x, vertices[i].y);
      context.closePath();
      context.strokeStyle = "rgba(37,99,235,0.08)";
      context.lineWidth = 6;
      context.stroke();

      // main hex fill + stroke
      context.beginPath();
      context.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i += 1) context.lineTo(vertices[i].x, vertices[i].y);
      context.closePath();
      context.fillStyle = "#060B14";
      context.fill();
      context.strokeStyle = "rgba(37,99,235,0.35)";
      context.lineWidth = 1.5;
      context.stroke();

      // stylized X mark
      context.beginPath();
      context.moveTo(46, 46);
      context.lineTo(58, 46);
      context.lineTo(70, 62);
      context.lineTo(82, 46);
      context.lineTo(94, 46);
      context.lineTo(76, 70);
      context.lineTo(94, 94);
      context.lineTo(82, 94);
      context.lineTo(70, 78);
      context.lineTo(58, 94);
      context.lineTo(46, 94);
      context.lineTo(64, 70);
      context.closePath();
      context.fillStyle = "#2563EB";
      context.fill();

      // center diamond
      context.beginPath();
      context.moveTo(70, 65);
      context.lineTo(75, 70);
      context.lineTo(70, 75);
      context.lineTo(65, 70);
      context.closePath();
      context.fillStyle = "#60A5FA";
      context.fill();

      const now = Date.now();
      const t = (now % 3000) / 3000;

      // trail
      for (let i = 0; i < 20; i += 1) {
        let trailT = t - i * 0.004;
        if (trailT < 0) trailT += 1;
        const point = getPerimeterPosition(vertices, trailT);
        const opacity = (1 - i / 20) * 0.6;
        const radius = Math.max(0.5, 2.5 - i * 0.1);
        context.beginPath();
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(96,165,250,${opacity.toFixed(3)})`;
        context.fill();
      }

      const orb = getPerimeterPosition(vertices, t);

      const outer = context.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, 14);
      outer.addColorStop(0, "rgba(37,99,235,0.15)");
      outer.addColorStop(1, "rgba(37,99,235,0)");
      context.beginPath();
      context.arc(orb.x, orb.y, 14, 0, Math.PI * 2);
      context.fillStyle = outer;
      context.fill();

      const mid = context.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, 8);
      mid.addColorStop(0, "rgba(37,99,235,0.4)");
      mid.addColorStop(1, "rgba(37,99,235,0)");
      context.beginPath();
      context.arc(orb.x, orb.y, 8, 0, Math.PI * 2);
      context.fillStyle = mid;
      context.fill();

      context.beginPath();
      context.arc(orb.x, orb.y, 3, 0, Math.PI * 2);
      context.fillStyle = "#60A5FA";
      context.fill();

      context.beginPath();
      context.arc(orb.x, orb.y, 1.5, 0, Math.PI * 2);
      context.fillStyle = "#FFFFFF";
      context.fill();
    };

    const animate = () => {
      drawFrame();
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} width={SIZE} height={SIZE} className="h-[140px] w-[140px]" />;
}
