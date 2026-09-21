import { useState } from 'react';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { AssistanceRequestForm } from './components/forms/AssistanceRequestForm';
import { EmergencyReportForm } from './components/forms/EmergencyReportForm';
import { AlertsSection } from './components/alerts/AlertsSection';
import { RequestTracker } from './components/tracking/RequestTracker';
import { PublicProfile } from './components/profile/PublicProfile';
import { SectionPlaceholder } from './components/layout/SectionPlaceholder';
import { AppHeader } from './components/layout/AppHeader';

const navigationItems = [
  { id: 'overview', label: 'Overview' },
  { id: 'report', label: 'Report emergency' },
  { id: 'assistance', label: 'Request assistance' },
  { id: 'tracking', label: 'My requests' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'profile', label: 'Profile' },
];

function App() {
  const [activeSection, setActiveSection] = useState('overview');

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="page-container">
        <nav className="section-nav" aria-label="Public dashboard sections">
          {navigationItems.map((item) => (
            <button
              aria-current={activeSection === item.id ? 'page' : undefined}
              className={activeSection === item.id ? 'nav-link active' : 'nav-link'}
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>

        {activeSection === 'overview' && <DashboardOverview onNavigate={setActiveSection} />}
        {activeSection === 'report' && <EmergencyReportForm />}
        {activeSection === 'assistance' && <AssistanceRequestForm />}
        {activeSection === 'tracking' && <RequestTracker />}
        {activeSection === 'alerts' && <AlertsSection />}
        {activeSection === 'profile' && <PublicProfile />}
      </main>
    </div>
  );
}

export default App;
