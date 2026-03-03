import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import OrganicMoodboard from './OrganicMoodboard';
import ErrorBoundary from './components/ErrorBoundary';
import { WelcomeScreen } from './components/WelcomeScreen';

function App() {
  const [hasEntered, setHasEntered] = useState(false);

  return (
    <div className="w-full h-screen">
      <ErrorBoundary>
        <AnimatePresence mode="wait">
          {!hasEntered ? (
            <WelcomeScreen key="welcome" onEnter={() => setHasEntered(true)} />
          ) : (
            <OrganicMoodboard key="canvas" />
          )}
        </AnimatePresence>
      </ErrorBoundary>
    </div>
  );
}

export default App;