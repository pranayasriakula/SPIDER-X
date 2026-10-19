
import { useCallback, useEffect, useState } from 'react';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import RobotStatus from './components/dashboard/RobotStatus';
import { SafetyPrecautions } from './components/dashboard/SafetyPrecautions';
import { AssistanceRequestForm } from './components/forms/AssistanceRequestForm';
import { EmergencyReportForm } from './components/forms/EmergencyReportForm';
import { AlertsSection } from './components/alerts/AlertsSection';
import { RequestTracker } from './components/tracking/RequestTracker';
import { PublicProfile } from './components/profile/PublicProfile';
import { GovernmentAccess } from './components/government/GovernmentAccess';
import { AppHeader } from './components/layout/AppHeader';
import { AuthPanel } from './components/auth/AuthPanel';
import { getCurrentUser, logoutAccount } from './services/authService';
import {
  clearAccessToken,
  getAccessToken,
  storeAccessToken,
} from './services/authSession';

const navigationItems = [
  { id: 'overview', label: 'Overview' },
  { id: 'robot-status', label: 'Robot Status' },
  { id: 'report', label: 'Report emergency' },
  { id: 'assistance', label: 'Request assistance' },
  { id: 'tracking', label: 'My requests' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'safety', label: 'Safety & Precautions' },
  { id: 'profile', label: 'Profile' },
  { id: 'government-access', label: 'Government Access' },
  { id: 'account', label: 'Account' },
];

function App() {
  const [activeSection, setActiveSection] = useState('overview');
  const [auth, setAuth] = useState({
    loading: true,
    user: null,
    profile: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    const accessToken = getAccessToken();

    if (!accessToken) {
      setAuth({
        loading: false,
        user: null,
        profile: null,
        error: null,
      });
      return () => {
        cancelled = true;
      };
    }

    getCurrentUser(accessToken)
      .then(({ user, profile }) => {
        if (cancelled) return;

        setAuth({
          loading: false,
          user,
          profile,
          error: null,
        });
      })
      .catch((error) => {
        if (cancelled) return;

        clearAccessToken();
        setAuth({
          loading: false,
          user: null,
          profile: null,
          error,
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshAuthenticatedUser = useCallback(async () => {
    const accessToken = getAccessToken();

    if (!accessToken) {
      setAuth({
        loading: false,
        user: null,
        profile: null,
        error: null,
      });
      return null;
    }

    try {
      const { user, profile } = await getCurrentUser(accessToken);

      setAuth({
        loading: false,
        user,
        profile,
        error: null,
      });

      return { user, profile };
    } catch (error) {
      setAuth((current) => ({
        ...current,
        loading: false,
        error,
      }));

      throw error;
    }
  }, []);

  async function handleAuthenticated(accessToken) {
    storeAccessToken(accessToken);

    try {
      await refreshAuthenticatedUser();
      setActiveSection('profile');
    } catch (error) {
      clearAccessToken();
      setAuth({
        loading: false,
        user: null,
        profile: null,
        error,
      });
      throw error;
    }
  }

  async function handleLogout() {
    const accessToken = getAccessToken();

    if (!accessToken) return;

    try {
      await logoutAccount(accessToken);
    } catch (error) {
      setAuth((current) => ({
        ...current,
        error,
      }));
      return;
    }

    clearAccessToken();

    setAuth({
      loading: false,
      user: null,
      profile: null,
      error: null,
    });

    setActiveSection('overview');
  }

  return (
    <div className="app-shell">
      <AppHeader
        profile={auth.profile}
        onLogout={handleLogout}
        onOpenAccount={() => setActiveSection('account')}
      />

      <main className="page-container">
        <nav
          className="section-nav"
          aria-label="Public dashboard sections"
        >
          {navigationItems.map((item) => (
            <button
              aria-current={
                activeSection === item.id ? 'page' : undefined
              }
              className={
                activeSection === item.id
                  ? 'nav-link active'
                  : 'nav-link'
              }
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>

        {activeSection === 'overview' && (
          <DashboardOverview onNavigate={setActiveSection} />
        )}

        {activeSection === 'robot-status' && <RobotStatus />}

        {activeSection === 'report' && (
          <EmergencyReportForm
            isAuthenticated={Boolean(auth.profile)}
            onOpenAccount={() => setActiveSection('account')}
          />
        )}

        {activeSection === 'assistance' && <AssistanceRequestForm />}

        {activeSection === 'tracking' && (
          <RequestTracker
            isAuthenticated={Boolean(auth.profile)}
            onOpenAccount={() => setActiveSection('account')}
          />
        )}

        {activeSection === 'alerts' && <AlertsSection />}

        {activeSection === 'safety' && <SafetyPrecautions />}

        {activeSection === 'profile' && (
          <PublicProfile
            auth={auth}
            onOpenAccount={() => setActiveSection('account')}
          />
        )}

        {activeSection === 'government-access' && (
          <GovernmentAccess
            auth={auth}
            onOpenAccount={() => setActiveSection('account')}
            onAuthRefresh={refreshAuthenticatedUser}
          />
        )}

        {activeSection === 'account' && (
          <AuthPanel onAuthenticated={handleAuthenticated} />
        )}
      </main>
    </div>
  );
}

export default App;
