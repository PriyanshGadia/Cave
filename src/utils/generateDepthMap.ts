// Helper script to generate a high-res depth map canvas for the 3D displacement shader
export function generateDepthCanvas(): string {
  // SVG based high-precision depth map
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
    <defs>
      <!-- Base Cave Depth: Darker is farther away (0.0 = deep background), Brighter is closer (1.0 = foreground) -->
      <radialGradient id="bgTunnelDepth" cx="75%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#050505" />
        <stop offset="60%" stop-color="#2a2a2a" />
        <stop offset="100%" stop-color="#555555" />
      </radialGradient>
      
      <!-- Door Depth: Recessed at mid-distance -->
      <radialGradient id="doorDepth" cx="48%" cy="48%" r="40%">
        <stop offset="0%" stop-color="#606060" />
        <stop offset="45%" stop-color="#454545" />
        <stop offset="70%" stop-color="#353535" />
        <stop offset="100%" stop-color="#202020" />
      </radialGradient>

      <!-- Center Biometric Lock: Raised closer to camera -->
      <radialGradient id="lockDepth" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#8a8a8a" />
        <stop offset="70%" stop-color="#707070" />
        <stop offset="100%" stop-color="#555555" />
      </radialGradient>

      <!-- Foreground Left & Right Rock Arches: Closest to camera -->
      <linearGradient id="leftRockDepth" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#e0e0e0" />
        <stop offset="50%" stop-color="#999999" />
        <stop offset="100%" stop-color="#353535" />
      </linearGradient>

      <linearGradient id="groundDepth" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stop-color="#f5f5f5" />
        <stop offset="50%" stop-color="#909090" />
        <stop offset="100%" stop-color="#303030" />
      </linearGradient>
    </defs>

    <!-- Deep Background Tunnel -->
    <rect width="1920" height="1080" fill="url(#bgTunnelDepth)" />

    <!-- Center Blast Door -->
    <circle cx="940" cy="510" r="420" fill="url(#doorDepth)" />

    <!-- Biometric Center Panel -->
    <circle cx="940" cy="510" r="140" fill="url(#lockDepth)" />

    <!-- Left Rocky Cavern Wall (Foreground) -->
    <path d="M0,0 L520,0 Q420,380 480,720 L380,1080 L0,1080 Z" fill="url(#leftRockDepth)" opacity="0.9" />

    <!-- Right Cave Arch & Support Beams -->
    <path d="M1920,0 L1480,0 Q1560,400 1520,800 L1680,1080 L1920,1080 Z" fill="#666666" opacity="0.8" />

    <!-- Foreground Rocky Floor -->
    <path d="M0,820 Q960,780 1920,840 L1920,1080 L0,1080 Z" fill="url(#groundDepth)" opacity="0.95" />
  </svg>`;

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
