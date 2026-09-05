import React from 'react';

interface IrisScannerApertureProps {
  isScanning: boolean;
  isSuccess: boolean;
}

export const IrisScannerAperture: React.FC<IrisScannerApertureProps> = ({
  isScanning,
  isSuccess,
}) => {
  return (
    <div
      style={{
        position: 'relative',
        width: '120px',
        height: '120px',
        margin: '0 auto',
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #2a3544 0%, #101620 50%, #06090d 100%)',
        border: '3px solid #1a222e',
        boxShadow: isSuccess
          ? '0 0 25px rgba(0, 255, 102, 0.5), inset 0 0 15px rgba(0, 255, 102, 0.4)'
          : isScanning
          ? '0 0 30px rgba(0, 243, 255, 0.6), inset 0 0 20px rgba(0, 243, 255, 0.5)'
          : '0 0 15px rgba(0, 243, 255, 0.2), inset 0 0 10px rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.4s ease',
      }}
    >
      {/* Outer Hex Screws Ring */}
      <svg
        width="114"
        height="114"
        viewBox="0 0 114 114"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          animation: isScanning ? 'spinAperture 6s linear infinite' : 'none',
        }}
      >
        <circle cx="57" cy="57" r="54" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="2" fill="none" />
        <circle
          cx="57"
          cy="57"
          r="50"
          stroke={isSuccess ? '#00ff66' : '#00f3ff'}
          strokeWidth="1.5"
          strokeDasharray="6 8"
          fill="none"
          opacity={isScanning ? 0.9 : 0.4}
        />
        {/* 6 Peripheral Hex Screws */}
        {[0, 60, 120, 180, 240, 300].map(deg => {
          const rad = (deg * Math.PI) / 180;
          const x = 57 + Math.cos(rad) * 48;
          const y = 57 + Math.sin(rad) * 48;
          return (
            <circle
              key={deg}
              cx={x}
              cy={y}
              r="2.5"
              fill="#0d131a"
              stroke="#3a4759"
              strokeWidth="1"
            />
          );
        })}
      </svg>

      {/* Internal Optical Lens with Dynamic Iris Blades */}
      <div
        style={{
          width: '74px',
          height: '74px',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 40% 30%, rgba(0, 243, 255, 0.35) 0%, rgba(13, 18, 25, 0.95) 70%)',
          border: `2px solid ${isSuccess ? '#00ff66' : isScanning ? '#00f3ff' : 'rgba(0, 243, 255, 0.3)'}`,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Optical Glint Reflection */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '12px',
            width: '20px',
            height: '10px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, transparent 80%)',
            transform: 'rotate(-30deg)',
          }}
        />

        {/* Central Camera Pupil Sensor */}
        <div
          style={{
            width: isScanning ? '28px' : '18px',
            height: isScanning ? '28px' : '18px',
            borderRadius: '50%',
            background: isSuccess
              ? 'radial-gradient(circle, #00ff66 0%, #004d1a 100%)'
              : isScanning
              ? 'radial-gradient(circle, #00f3ff 0%, #00364d 100%)'
              : 'radial-gradient(circle, #0d1219 0%, #000000 100%)',
            border: '1.5px solid rgba(255, 255, 255, 0.2)',
            boxShadow: isScanning ? '0 0 15px #00f3ff' : 'none',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />
      </div>

      <style>{`
        @keyframes spinAperture {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
