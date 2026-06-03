"use client";

export function CRTOverlay() {
  return (
    <>
      {/* Vignette */}
      <div className="crt-overlay" aria-hidden="true" />
      {/* Moving scanline */}
      <div className="scanline" aria-hidden="true" />
    </>
  );
}
