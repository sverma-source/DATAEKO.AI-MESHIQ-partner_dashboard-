"use client";

import React from "react";

/**
 * MeshIQLoginBackground
 * 
 * Translates meshIQ's visual language into the enterprise assessment login environment:
 * - Top-right: Radial "data in motion" sunburst / iris with radiating lines & orbital rings in meshIQ green (#38B449, #8CC63E)
 * - Bottom-left: Flowing geometric contour ribbon with multi-line curves in meshIQ magenta/purple (#C026D3, #A855F7)
 * - Base: Clean enterprise coordinate grid with precision ticks
 * - Periphery composition: Keeps central login card 100% readable with zero interference
 */
export const MeshIQLoginBackground: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0"
    >
      {/* 1. Precision Enterprise Technical Grid */}
      <svg
        className="absolute inset-0 w-full h-full opacity-40"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="meshiq-login-grid"
            width="48"
            height="48"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 48 0 L 0 0 0 48"
              fill="none"
              stroke="#CBD5E1"
              strokeWidth="0.75"
              strokeDasharray="2 4"
            />
            {/* Coordinate intersection tick (+) at 48x48 */}
            <path
              d="M 45 48 L 51 48 M 48 45 L 48 51"
              fill="none"
              stroke="#94A3B8"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#meshiq-login-grid)" />
      </svg>

      {/* 2. Soft Ambient Radial Glows (Right: Green / Left: Purple) */}
      <div
        className="absolute -top-24 -right-24 w-[550px] h-[550px] lg:w-[700px] lg:h-[700px] rounded-full opacity-60"
        style={{
          background:
            "radial-gradient(circle, rgba(56, 180, 73, 0.12) 0%, rgba(140, 198, 62, 0.05) 45%, transparent 70%)",
        }}
      />
      <div
        className="absolute -bottom-24 -left-24 w-[550px] h-[550px] lg:w-[700px] lg:h-[700px] rounded-full opacity-50"
        style={{
          background:
            "radial-gradient(circle, rgba(192, 38, 211, 0.09) 0%, rgba(168, 85, 247, 0.04) 45%, transparent 70%)",
        }}
      />

      {/* 3. Top-Right Radial "Data in Motion" Iris / Sunburst (Green Palette) */}
      <div className="hidden md:block absolute -top-20 -right-20 w-[520px] h-[520px] lg:w-[680px] lg:h-[680px]">
        <svg
          viewBox="0 0 600 600"
          className="w-full h-full opacity-55"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="radialGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38B449" stopOpacity="0.85" />
              <stop offset="60%" stopColor="#8CC63E" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#8CC63E" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="radialMagentaGrad" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#C026D3" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#38B449" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Concentric orbital guide rings */}
          <circle cx="300" cy="300" r="80" stroke="#38B449" strokeWidth="1" strokeDasharray="3 6" opacity="0.35" />
          <circle cx="300" cy="300" r="140" stroke="#8CC63E" strokeWidth="1" strokeDasharray="2 4" opacity="0.4" />
          <circle cx="300" cy="300" r="200" stroke="#38B449" strokeWidth="1.25" opacity="0.25" />
          <circle cx="300" cy="300" r="260" stroke="#CBD5E1" strokeWidth="0.75" strokeDasharray="4 8" opacity="0.4" />

          {/* Radiating Data-in-Motion Lines (56 rays with alternating length & stroke) */}
          {Array.from({ length: 56 }).map((_, i) => {
            const angle = (i * 360) / 56;
            const rad = (angle * Math.PI) / 180;
            const innerR = 90 + (i % 3) * 12;
            const outerR = 210 + (i % 4) * 20 + ((i * 7) % 25);
            const x1 = Number((300 + innerR * Math.cos(rad)).toFixed(2));
            const y1 = Number((300 + innerR * Math.sin(rad)).toFixed(2));
            const x2 = Number((300 + outerR * Math.cos(rad)).toFixed(2));
            const y2 = Number((300 + outerR * Math.sin(rad)).toFixed(2));
            const strokeColor = i % 8 === 0 ? "url(#radialMagentaGrad)" : "url(#radialGreenGrad)";
            const strokeWidth = i % 4 === 0 ? 1.5 : 0.85;
            const opacity = Number((0.35 + (i % 5) * 0.12).toFixed(2));

            return (
              <line
                key={`ray-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                opacity={opacity}
                strokeLinecap="round"
              />
            );
          })}

          {/* Orbiting data nodes */}
          <circle cx="440" cy="300" r="3.5" fill="#38B449" opacity="0.8" />
          <circle cx="300" cy="160" r="2.5" fill="#8CC63E" opacity="0.8" />
          <circle cx="180" cy="220" r="3" fill="#C026D3" opacity="0.7" />
          <circle cx="410" cy="410" r="3" fill="#38B449" opacity="0.6" />
        </svg>
      </div>

      {/* 4. Bottom-Left Flowing Geometric Contour Mesh / Ribbon (Magenta & Purple Palette) */}
      <div className="hidden md:block absolute -bottom-16 -left-16 w-[520px] h-[520px] lg:w-[680px] lg:h-[680px]">
        <svg
          viewBox="0 0 600 600"
          className="w-full h-full opacity-45"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="flowMagentaPurple" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#C026D3" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#A855F7" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#38B449" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="flowSubtle" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#A855F7" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#CBD5E1" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Multi-line curved geometric wave ribbon inspired by meshIQ references */}
          {[
            "M 20 580 C 120 490, 220 540, 360 410 C 460 310, 520 220, 580 90",
            "M 35 595 C 135 505, 235 555, 375 425 C 475 325, 535 235, 595 105",
            "M 50 610 C 150 520, 250 570, 390 440 C 490 340, 550 250, 610 120",
            "M 65 625 C 165 535, 265 585, 405 455 C 505 355, 565 265, 625 135",
            "M 80 640 C 180 550, 280 600, 420 470 C 520 370, 580 280, 640 150",
            "M 10 560 C 105 475, 205 520, 340 395 C 445 295, 505 205, 565 75",
            "M -5 540 C 90 460, 190 500, 320 380 C 430 280, 490 190, 550 60",
            "M -20 520 C 75 445, 175 480, 300 365 C 415 265, 475 175, 535 45",
          ].map((d, i) => (
            <path
              key={`wave-${i}`}
              d={d}
              stroke={i % 2 === 0 ? "url(#flowMagentaPurple)" : "url(#flowSubtle)"}
              strokeWidth={i % 3 === 0 ? 1.5 : 1}
              opacity={0.4 + (i * 0.05)}
            />
          ))}

          {/* Connecting contour transversal lines */}
          <line x1="80" y1="520" x2="160" y2="580" stroke="#C026D3" strokeWidth="0.75" opacity="0.3" strokeDasharray="3 3" />
          <line x1="220" y1="460" x2="300" y2="520" stroke="#A855F7" strokeWidth="0.75" opacity="0.3" strokeDasharray="3 3" />
          <line x1="360" y1="360" x2="440" y2="420" stroke="#38B449" strokeWidth="0.75" opacity="0.3" strokeDasharray="3 3" />

          {/* Node callouts */}
          <circle cx="360" cy="410" r="3" fill="#C026D3" opacity="0.75" />
          <circle cx="220" cy="540" r="2.5" fill="#A855F7" opacity="0.65" />
          <circle cx="460" cy="310" r="3.5" fill="#38B449" opacity="0.8" />
        </svg>
      </div>

      {/* 5. Center Clean Radial Mask (Soft depth ensuring login card is high-contrast) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 65% 55% at 50% 50%, rgba(248, 250, 252, 0.95) 0%, rgba(248, 250, 252, 0.75) 55%, transparent 100%)",
        }}
      />
    </div>
  );
};
