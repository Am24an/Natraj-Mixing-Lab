import { ErrorBoundary } from './ErrorBoundary';
import { ThemeProvider } from './ThemeProvider';
import { Workspace } from '@/features/workspace/Workspace';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { SplashScreen } from '@/components/ui/SplashScreen';
import { useState } from 'react';

/**
 * App — Root component.
 * Wraps the application in error handling and theme support,
 * then renders the single persistent Workspace.
 */
export function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
        <Workspace />
        <ToastContainer />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
