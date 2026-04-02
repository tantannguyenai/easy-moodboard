import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import OrganicMoodboard from './OrganicMoodboard';
import ErrorBoundary from './components/ErrorBoundary';
import { WelcomeScreen } from './components/WelcomeScreen';

function App() {
  const searchParams = new URLSearchParams(window.location.search);
  const sharedRoomId = searchParams.get('room');
  const shareToken = searchParams.get('token');
  const hasInviteLink = Boolean(sharedRoomId && shareToken);
  const [hasEntered, setHasEntered] = useState(hasInviteLink);

  return (
    <div className="w-full h-screen">
      <ErrorBoundary>
        <AnimatePresence mode="wait">
          {!hasEntered ? (
            <WelcomeScreen key="welcome" onEnter={() => setHasEntered(true)} />
          ) : (
            <OrganicMoodboard key="canvas" sharedRoomId={sharedRoomId} shareToken={shareToken} />
          )}
        </AnimatePresence>
      </ErrorBoundary>
    </div>
  );
}

export default App;