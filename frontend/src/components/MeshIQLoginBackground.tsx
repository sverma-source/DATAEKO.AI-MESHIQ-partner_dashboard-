"use client";

import React from "react";

/**
 * MeshIQLoginBackground
 * 
 * Batch 2A Visual Depth & Spatial Composition Refinement:
 * - Upper-Right: Expansive radial "data in motion" iris/sunburst in meshIQ green (#38B449, #8CC63E)
 *   with counter-spectrum magenta/purple accents (#C026D3, #9333EA) and open core.
 * - Lower-Left: Layered flowing contour ribbon with 14 parallel bezier sweeps and faceted cross-lines.
 * - Periphery Framing: Left and right edge technical contour fields occupying the outer 25-30% of the canvas.
 * - Precision Base: Clean enterprise coordinate dot grid with perimeter coordinate ticks.
 * - Central Area: Smooth feathered transition ensuring 100% contrast and readability for the login card.
 */
export const MeshIQLoginBackground: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0"
    >
      {/* 1. Precision Enterprise Technical Grid */}
      <svg
        className="absolute inset-0 w-full h-full opacity-60"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="meshiq-login-grid-2a"
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
              strokeWidth="1.2"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#meshiq-login-grid-2a)" />
      </svg>

      {/* 2. Soft Ambient Radial Color Fields */}
      <div
        className="absolute -top-32 -right-32 w-[700px] h-[700px] lg:w-[950px] lg:h-[950px] rounded-full opacity-70"
        style={{
          background:
            "radial-gradient(circle, rgba(56, 180, 73, 0.16) 0%, rgba(140, 198, 62, 0.08) 40%, transparent 70%)",
        }}
      />
      <div
        className="absolute -bottom-32 -left-32 w-[700px] h-[700px] lg:w-[950px] lg:h-[950px] rounded-full opacity-65"
        style={{
          background:
            "radial-gradient(circle, rgba(192, 38, 211, 0.13) 0%, rgba(168, 85, 247, 0.06) 40%, transparent 70%)",
        }}
      />

      {/* 3. Upper-Right: Large Radial "Data in Motion" Iris / Sunburst */}
      <div className="hidden md:block absolute -top-28 -right-28 sm:-top-36 sm:-right-36 lg:-top-48 lg:-right-48 w-[680px] h-[680px] lg:w-[950px] lg:h-[950px] xl:w-[1150px] xl:h-[1150px]">
        <svg
          viewBox="0 0 800 800"
          className="w-full h-full opacity-85"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="radialGreenGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38B449" stopOpacity="0.9" />
              <stop offset="65%" stopColor="#8CC63E" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#8CC63E" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="radialMagentaGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#C026D3" stopOpacity="0.85" />
              <stop offset="60%" stopColor="#A855F7" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#38B449" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="radialLimeGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8CC63E" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#008638" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Concentric orbital guide rings */}
          <circle cx="400" cy="400" r="105" stroke="#38B449" strokeWidth="1.25" strokeDasharray="4 6" opacity="0.45" />
          <circle cx="400" cy="400" r="175" stroke="#8CC63E" strokeWidth="1" strokeDasharray="3 5" opacity="0.5" />
          <circle cx="400" cy="400" r="260" stroke="#38B449" strokeWidth="1.5" opacity="0.35" />
          <circle cx="400" cy="400" r="340" stroke="#94A3B8" strokeWidth="0.75" strokeDasharray="5 8" opacity="0.45" />
          <circle cx="400" cy="400" r="390" stroke="#CBD5E1" strokeWidth="0.5" opacity="0.3" />

          {/* Radiating Data-in-Motion Lines (72 rays with meshIQ dual-spectrum transition) */}
          {Array.from({ length: 72 }).map((_, i) => {
            const angle = (i * 360) / 72;
            const rad = (angle * Math.PI) / 180;
            // Alternating ray lengths with structured pattern
            const innerR = 120 + (i % 4) * 14;
            const outerR = 270 + (i % 6) * 22 + ((i * 5) % 35);
            const x1 = Number((400 + innerR * Math.cos(rad)).toFixed(2));
            const y1 = Number((400 + innerR * Math.sin(rad)).toFixed(2));
            const x2 = Number((400 + outerR * Math.cos(rad)).toFixed(2));
            const y2 = Number((400 + outerR * Math.sin(rad)).toFixed(2));

            // Angle 130° to 220° uses magenta/purple; 220° to 260° transition; rest is green/lime
            const isMagentaSector = angle >= 125 && angle <= 220;
            const isTransition = (angle > 105 && angle < 125) || (angle > 220 && angle < 245);
            const strokeColor = isMagentaSector
              ? "url(#radialMagentaGrad2)"
              : isTransition
              ? "#A855F7"
              : i % 3 === 0
              ? "url(#radialLimeGrad2)"
              : "url(#radialGreenGrad2)";

            const strokeWidth = i % 4 === 0 ? 1.75 : i % 2 === 0 ? 1.2 : 0.85;
            const opacity = Number((0.45 + (i % 5) * 0.11).toFixed(2));

            return (
              <line
                key={`ray-2a-${i}`}
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

          {/* Orbiting data nodes and technical ticks */}
          <circle cx="575" cy="400" r="4" fill="#38B449" opacity="0.85" />
          <circle cx="400" cy="225" r="3" fill="#8CC63E" opacity="0.8" />
          <circle cx="250" cy="300" r="3.5" fill="#C026D3" opacity="0.8" />
          <circle cx="530" cy="530" r="3.5" fill="#38B449" opacity="0.75" />
          <circle cx="280" cy="510" r="3" fill="#A855F7" opacity="0.7" />
          <circle cx="400" cy="575" r="3" fill="#008638" opacity="0.8" />
          <circle cx="660" cy="400" r="2.5" fill="#8CC63E" opacity="0.65" />
        </svg>
      </div>

      {/* 4. Lower-Left: Layered Flowing Geometric Ribbon / Contour Mesh */}
      <div className="hidden md:block absolute -bottom-24 -left-24 sm:-bottom-32 sm:-left-32 lg:-bottom-44 lg:-left-44 w-[650px] h-[650px] lg:w-[900px] lg:h-[900px] xl:w-[1100px] xl:h-[1100px]">
        <svg
          viewBox="0 0 800 800"
          className="w-full h-full opacity-75"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="flowMagentaPurple2" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#C026D3" stopOpacity="0.85" />
              <stop offset="45%" stopColor="#A855F7" stopOpacity="0.7" />
              <stop offset="85%" stopColor="#38B449" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#8CC63E" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="flowGreenPurple2" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#A855F7" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#38B449" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#8CC63E" stopOpacity="0.25" />
            </linearGradient>
          </defs>

          {/* 14 multi-line flowing contour curves */}
          {[
            "M 15 780 C 140 660, 280 720, 470 540 C 600 410, 680 290, 770 120",
            "M 35 800 C 160 680, 300 740, 490 560 C 620 430, 700 310, 790 140",
            "M 55 820 C 180 700, 320 760, 510 580 C 640 450, 720 330, 810 160",
            "M 75 840 C 200 720, 340 780, 530 600 C 660 470, 740 350, 830 180",
            "M 95 860 C 220 740, 360 800, 550 620 C 680 490, 760 370, 850 200",
            "M -5 760 C 120 640, 260 700, 450 520 C 580 390, 660 270, 750 100",
            "M -25 740 C 100 620, 240 680, 430 500 C 560 370, 640 250, 730 80",
            "M -45 720 C 80 600, 220 660, 410 480 C 540 350, 620 230, 710 60",
            "M -65 700 C 60 580, 200 640, 390 460 C 520 330, 600 210, 690 40",
            "M 115 880 C 240 760, 380 820, 570 640 C 700 510, 780 390, 870 220",
            "M 135 900 C 260 780, 400 840, 590 660 C 720 530, 800 410, 890 240",
            "M -85 680 C 40 560, 180 620, 370 440 C 500 310, 580 190, 670 20",
            "M -105 660 C 20 540, 160 600, 350 420 C 480 290, 560 170, 650 0",
            "M 155 920 C 280 800, 420 860, 610 680 C 740 550, 820 430, 910 260",
          ].map((d, i) => (
            <path
              key={`ribbon-2a-${i}`}
              d={d}
              stroke={i % 2 === 0 ? "url(#flowMagentaPurple2)" : "url(#flowGreenPurple2)"}
              strokeWidth={i % 4 === 0 ? 1.75 : i % 2 === 0 ? 1.25 : 0.85}
              opacity={Number((0.45 + (i * 0.03)).toFixed(2))}
            />
          ))}

          {/* Faceted structural transversal cross-lines (inspired by meshIQ reference 3) */}
          <line x1="110" y1="690" x2="210" y2="760" stroke="#C026D3" strokeWidth="1" opacity="0.45" strokeDasharray="3 3" />
          <line x1="290" y1="610" x2="390" y2="690" stroke="#A855F7" strokeWidth="1" opacity="0.45" strokeDasharray="3 3" />
          <line x1="470" y1="490" x2="570" y2="570" stroke="#38B449" strokeWidth="1" opacity="0.45" strokeDasharray="3 3" />
          <line x1="610" y1="360" x2="700" y2="440" stroke="#8CC63E" strokeWidth="1" opacity="0.45" strokeDasharray="3 3" />

          {/* Node callouts */}
          <circle cx="470" cy="540" r="4" fill="#C026D3" opacity="0.85" />
          <circle cx="280" cy="720" r="3" fill="#A855F7" opacity="0.75" />
          <circle cx="600" cy="410" r="4.5" fill="#38B449" opacity="0.85" />
          <circle cx="680" cy="290" r="3.5" fill="#8CC63E" opacity="0.8" />
        </svg>
      </div>

      {/* 5. Edge-to-Edge Framing (Left & Right Lateral Contour Fields) */}
      {/* Mid-Left Lateral Sweeping Field */}
      <div className="hidden xl:block absolute left-0 top-1/3 -translate-y-1/2 w-48 h-96 opacity-45">
        <svg viewBox="0 0 200 400" className="w-full h-full" fill="none">
          <path d="M 0 50 C 70 120, 70 280, 0 350" stroke="#A855F7" strokeWidth="1" strokeDasharray="3 4" />
          <path d="M 0 80 C 90 150, 90 250, 0 320" stroke="#C026D3" strokeWidth="1.25" />
          <path d="M 0 110 C 110 170, 110 230, 0 290" stroke="#38B449" strokeWidth="1" strokeDasharray="2 3" />
          <circle cx="85" cy="200" r="3" fill="#A855F7" opacity="0.7" />
          {/* Coordinate tick */}
          <text x="10" y="30" fill="#94A3B8" fontSize="9" fontFamily="monospace" letterSpacing="0.05em">
            47°36&apos;N
          </text>
        </svg>
      </div>

      {/* Mid-Right Lateral Sweeping Field */}
      <div className="hidden xl:block absolute right-0 top-1/2 -translate-y-1/2 w-48 h-96 opacity-45">
        <svg viewBox="0 0 200 400" className="w-full h-full" fill="none">
          <path d="M 200 50 C 130 120, 130 280, 200 350" stroke="#38B449" strokeWidth="1" strokeDasharray="3 4" />
          <path d="M 200 80 C 110 150, 110 250, 200 320" stroke="#8CC63E" strokeWidth="1.25" />
          <path d="M 200 110 C 90 170, 90 230, 200 290" stroke="#38B449" strokeWidth="1" strokeDasharray="2 3" />
          <circle cx="115" cy="200" r="3" fill="#38B449" opacity="0.7" />
          {/* Coordinate tick */}
          <text x="130" y="380" fill="#94A3B8" fontSize="9" fontFamily="monospace" letterSpacing="0.05em">
            122°19&apos;W
          </text>
        </svg>
      </div>

      {/* 6. Smooth Feathered Central Focus Mask (Guarantees 100% contrast for login card) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 68% 58% at 50% 50%, rgba(248, 250, 252, 0.96) 0%, rgba(248, 250, 252, 0.82) 48%, rgba(248, 250, 252, 0.3) 78%, transparent 100%)",
        }}
      />
    </div>
  );
};
