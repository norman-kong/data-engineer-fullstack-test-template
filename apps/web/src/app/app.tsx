import posthog from 'posthog-js';
import { Route, Routes } from 'react-router-dom';

export function App() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Demo Events</h1>

      <button
        onClick={() => posthog.capture('feature_used')}
        style={{ marginRight: '10px' }}
      >
        Simulate Feature Usage
      </button>

      <button
        onClick={() => posthog.capture('generation_failed')}
      >
        Simulate Generation Failure
      </button>

      <hr />

      <Routes>
        <Route
          path="/"
          element={<div>Home Page</div>}
        />
        <Route
          path="/page-2"
          element={<div>Page 2</div>}
        />
      </Routes>
    </div>
  );
}

export default App;
