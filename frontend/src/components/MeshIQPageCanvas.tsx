"use client";

import React from "react";

/**
 * MeshIQPageCanvas
 * 
 * Provides subtle edge-to-edge spatial composition for application workspaces:
 * - Far margin contour curves (hidden on smaller viewports, visible on xl screens)
 * - Faint ambient green/lime gradient field in upper periphery
 * - Non-interactive, accessible (aria-hidden), zero content interference
 */
export const MeshIQPageCanvas: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 overflow-hidden pointer-events-none select-none z-0"
    >
      {/* 1. Subtle Ambient Upper-Periphery Glow */}
      <div
        className="absolute -top-40 right-0 w-[600px] h-[600px] rounded-full opacity-60 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(56, 180, 73, 0.05) 0%, rgba(140, 198, 62, 0.02) 40%, transparent 70%)",
        }}
      />

      {/* 2. Far-Left Edge Contour Curves (Only visible on wide desktop viewports) */}
      <div className="hidden 2xl:block absolute left-0 top-1/4 w-36 h-96 opacity-25">
        <svg viewBox="0 0 150 400" className="w-full h-full" fill="none">
          <path d="M 0 40 C 60 110, 60 290, 0 360" stroke="#38B449" strokeWidth="1" strokeDasharray="3 4" />
          <path d="M 0 70 C 80 140, 80 260, 0 330" stroke="#8CC63E" strokeWidth="1.2" />
          <path d="M 0 100 C 95 160, 95 240, 0 300" stroke="#CBD5E1" strokeWidth="0.8" strokeDasharray="2 3" />
        </svg>
      </div>

      {/* 3. Far-Right Edge Contour Curves (Only visible on wide desktop viewports) */}
      <div className="hidden 2xl:block absolute right-0 top-1/3 w-36 h-96 opacity-25">
        <svg viewBox="0 0 150 400" className="w-full h-full" fill="none">
          <path d="M 150 40 C 90 110, 90 290, 150 360" stroke="#38B449" strokeWidth="1" strokeDasharray="3 4" />
          <path d="M 150 70 C 70 140, 70 260, 150 330" stroke="#A855F7" strokeWidth="1" strokeDasharray="2 3" />
          <path d="M 150 100 C 55 160, 55 240, 150 300" stroke="#8CC63E" strokeWidth="1.2" />
        </svg>
      </div>
    </div>
  );
};
