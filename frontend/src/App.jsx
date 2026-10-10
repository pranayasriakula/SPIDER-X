import { useEffect, useState } from 'react';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { AssistanceRequestForm } from './components/forms/AssistanceRequestForm';
import { EmergencyReportForm } from './components/forms/EmergencyReportForm';
import { AlertsSection } from './components/alerts/AlertsSection';
import { RequestTracker } from './components/tracking/RequestTracker';
import { PublicProfile } from './components/profile/PublicProfile';
import { SectionPlaceholder } from './components/layout/SectionPlaceholder';
import { AppHeader } from './components/layout/AppHeader';
import { AuthPanel } from './components/auth/AuthPanel';
import { WelcomePage } from './components/welcome/WelcomePage';
import GovernmentDashboard from './government/GovernmentDashboard';
import { getCurrentUser, logoutAccount } from './services/authService';
import { clearAccessToken, getAccessToken, storeAccessToken } from './services/authSession';

const navigationItems = [
  { id: 'overview', label: 'Overview' },
  { id: 'report', label: 'Report emergency' },
  { id: 'assistance', label: 'Request assistance' },
  { id: 'tracking', label: 'My requests' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'profile', label: 'Profile' },
  { id: 'account', label: 'Account' },
];

function App() {
  const [activeSection, setActiveSection] = useState('overview');
  const [selectedPortal, setSelectedPortal] = useState(null);
  const [auth, setAuth] = useState({ loading: true, user: null, profile: null, error: null });

  useEffect(() => {
    const accessToken = getAccessToken();
    if (!accessToken) { setAuth({ loading: false, user: null, profile: null, error: null }); return; }
    getCurrentUser(accessToken)
      .then(({ user, profile }) => setAuth({ loading: false, user, profile, error: null }))
      .catch((error) => { clearAccessToken(); setAuth({ loading: false, user: null, profile: null, error }); });
  }, []);

  
async function handleAuthenticated(accessToken) {
  try {
    // Verify the account with the backend before storing the token.
    const { user, profile } = await getCurrentUser(accessToken);

    const isGovernmentRole =
      profile.role === 'AUTHORITY' || profile.role === 'ADMIN';

    if (selectedPortal === 'government' && !isGovernmentRole) {
      throw new Error(
        'This account does not have Government Portal access.'
      );
    }

    if (selectedPortal === 'public' && profile.role !== 'PUBLIC') {
      throw new Error(
        'Please use the Government Portal for this account.'
      );
    }

    // Save the session only after successful role verification.
    storeAccessToken(accessToken);
    setAuth({ loading: false, user, profile, error: null });
    setActiveSection('overview');
  } catch (error) {
    clearAccessToken();
    throw error;
  }
}


async function handleLogout() {
  const accessToken = getAccessToken();

  try {
    if (accessToken) {
      await logoutAccount(accessToken);
    }
  } catch (error) {
    console.error('Server logout failed:', error);
  } finally {
    // Always clear the local session.
    clearAccessToken();

    setAuth({
      loading: false,
      user: null,
      profile: null,
      error: null,
    });

    setActiveSection('overview');

    // Return to the Welcome Page.
    setSelectedPortal(null);
  }
}

  const userRole = auth.profile?.role;
  if (auth.loading) {
  return <div className="page-container">Checking your session...</div>;
}

if (!auth.user && !selectedPortal) {
  return <WelcomePage onSelectPortal={setSelectedPortal} />;
}
if (!auth.user && selectedPortal) {
  return (
    <main
      className="page-container"
      style={{ minHeight: '100vh', paddingTop: '48px' }}
    >
      <button
        type="button"
        className="nav-link"
        onClick={() => setSelectedPortal(null)}
        style={{ marginBottom: '24px' }}
      >
        ← Back to Portal Selection
      </button>

      <AuthPanel
        key={selectedPortal}
        portal={selectedPortal}
        onAuthenticated={handleAuthenticated}
      />
    </main>
  );
}
  if (userRole === 'AUTHORITY' || userRole === 'ADMIN') {
    return (
      <GovernmentDashboard
        account={{
          user: auth.user,
          profile: auth.profile,
        }}
        onLogout={handleLogout}
      />
    );
  }


  return (
    <div className="app-shell">
      <AppHeader profile={auth.profile} onLogout={handleLogout} onOpenAccount={() => setActiveSection('account')} />
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
        {activeSection === 'report' && <EmergencyReportForm isAuthenticated={Boolean(auth.profile)} onOpenAccount={() => setActiveSection('account')} />}
        {activeSection === 'assistance' && <AssistanceRequestForm />}
        {activeSection === 'tracking' && <RequestTracker isAuthenticated={Boolean(auth.profile)} onOpenAccount={() => setActiveSection('account')} />}
        {activeSection === 'alerts' && <AlertsSection />}
        {activeSection === 'profile' && <PublicProfile auth={auth} onOpenAccount={() => setActiveSection('account')} />}
        {activeSection === 'account' && <AuthPanel onAuthenticated={handleAuthenticated} />}
      </main>
    </div>
  );
}

export default App;
