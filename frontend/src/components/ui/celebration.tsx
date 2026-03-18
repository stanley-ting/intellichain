"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CelebrationProps {
  trigger: boolean;
  className?: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  velocity: { x: number; y: number };
  rotation: number;
  rotationSpeed: number;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--risk-low))",
  "hsl(142, 71%, 45%)",
  "hsl(217, 91%, 60%)",
  "hsl(262, 83%, 58%)",
  "hsl(330, 81%, 60%)",
];

export function Celebration({ trigger, className }: CelebrationProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (trigger && !show) {
      setShow(true);

      // Create particles
      const newParticles: Particle[] = [];
      for (let i = 0; i < 50; i++) {
        newParticles.push({
          id: i,
          x: 50 + (Math.random() - 0.5) * 30,
          y: 30,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 4 + Math.random() * 6,
          velocity: {
            x: (Math.random() - 0.5) * 10,
            y: -5 - Math.random() * 10,
          },
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 20,
        });
      }
      setParticles(newParticles);

      // Animate
      let frame = 0;
      const maxFrames = 100;
      const interval = setInterval(() => {
        frame++;
        if (frame >= maxFrames) {
          clearInterval(interval);
          setShow(false);
          setParticles([]);
          return;
        }

        setParticles((prev) =>
          prev.map((p) => ({
            ...p,
            x: p.x + p.velocity.x * 0.5,
            y: p.y + p.velocity.y * 0.5,
            velocity: {
              x: p.velocity.x * 0.98,
              y: p.velocity.y + 0.3, // gravity
            },
            rotation: p.rotation + p.rotationSpeed,
          }))
        );
      }, 30);

      return () => clearInterval(interval);
    }
  }, [trigger, show]);

  if (!show || particles.length === 0) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 pointer-events-none z-50 overflow-hidden",
        className
      )}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {particles.map((p) => (
          <g
            key={p.id}
            transform={`translate(${p.x}, ${p.y}) rotate(${p.rotation})`}
          >
            {/* Confetti shape - randomly rectangles or circles */}
            {p.id % 3 === 0 ? (
              <circle r={p.size / 4} fill={p.color} opacity={0.9} />
            ) : (
              <rect
                x={-p.size / 4}
                y={-p.size / 8}
                width={p.size / 2}
                height={p.size / 4}
                fill={p.color}
                opacity={0.9}
                rx={0.5}
              />
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

// Simple success pulse animation
export function SuccessPulse({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-risk-low/20 animate-ping" />
        <div className="relative h-24 w-24 rounded-full bg-risk-low/30 flex items-center justify-center">
          <svg
            className="h-12 w-12 text-risk-low animate-in zoom-in duration-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
