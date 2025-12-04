import posthog from 'posthog-js';
import { BrowserRouter } from 'react-router-dom';
import * as ReactDOM from 'react-dom/client';
import App from './app/app';

posthog.init('phc_Fkjn31HYACdgCBuhK3NcyomGNxSDLL2LqTvJV4eRcS9', {
  api_host: 'https://us.i.posthog.com',
  person_profiles: 'identified_only',
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
);
