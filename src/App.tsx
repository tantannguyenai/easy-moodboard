import OrganicMoodboard from './OrganicMoodboard';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <div className="w-full h-screen">
      <ErrorBoundary>
        <OrganicMoodboard />
      </ErrorBoundary>
    </div>
  );
}

export default App;