import posthog from 'posthog-js';
import { Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';

const TEST_USER_ID = 'test-user-9';
const TEST_USER_EMAIL = 'normankong3@gmail.com';
const DUMMY_PROMPT = 'generate a floorplan for a 2-bedroom apartment';
const DUMMY_FAILURE_REASON = 'timeout';

export function App() {

  useEffect(() => {
      posthog.identify(TEST_USER_ID, {
        email: TEST_USER_EMAIL,
      });
    }, []); 

  const handleSimulateFeatureUsage = () => {
    posthog.capture('feature_used', {
      feature_name: 'demo_feature',
    });
  };

    const handleSimulateGenerationFailure = () => {
      posthog.capture('generation_failed', {
        failure_reason: DUMMY_FAILURE_REASON,
        input_prompt: DUMMY_PROMPT,
      });
    };
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>Demo Events</h1>

      <button
        onClick={handleSimulateFeatureUsage}
        style={{ marginRight: '10px' }}
      >
        Simulate Feature Usage
      </button>

      <button
        onClick={handleSimulateGenerationFailure}
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
