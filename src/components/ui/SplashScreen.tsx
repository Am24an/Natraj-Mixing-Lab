import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Show splash screen for 1.2s, then start fade out animation
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, 1200);

    // After fade out animation completes (300ms), unmount it
    const finishTimer = setTimeout(() => {
      onFinish();
    }, 1500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999, // ensures it sits above absolutely everything
        backgroundColor: 'var(--color-background, #0f172a)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isFading ? 0 : 1,
        transition: 'opacity 0.3s ease-out',
        pointerEvents: 'none', // just in case it lingers
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: 'scale-up-fade 0.8s ease-out forwards',
        }}
      >
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: 'var(--color-text-primary, #f8fafc)',
            letterSpacing: '0.02em',
            margin: 0,
            textShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
        >
          Natraj Mixing Lab
        </h1>
        <p
          style={{
            fontSize: '1rem',
            color: 'var(--color-text-muted, #94a3b8)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginTop: '8px',
          }}
        >
          Passport Studio
        </p>
      </div>
      <style>
        {`
          @keyframes scale-up-fade {
            0% {
              transform: scale(0.9);
              opacity: 0;
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
}
