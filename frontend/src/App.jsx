
import { useCallback, useEffect, useState } from 'react';

import { DashboardOverview } from './components/dashboard/DashboardOverview';

import { SafetyPrecautions } from './components/dashboard/SafetyPrecautions';
import { AssistanceRequestForm } from './components/forms/AssistanceRequestForm';
import { EmergencyReportForm } from './components/forms/EmergencyReportForm';
import { AlertsSection } from './components/alerts/AlertsSection';
import { RequestTracker } from './components/tracking/RequestTracker';
import { PublicProfile } from './components/profile/PublicProfile';
import { GovernmentAccess } from './components/government/GovernmentAccess';
import { GovernmentPortalLanding } from './components/government/GovernmentPortalLanding';
import { AppHeader } from './components/layout/AppHeader';
import { AuthPanel } from './components/auth/AuthPanel';
import { WelcomePage } from './components/welcome/WelcomePage';

import GovernmentDashboard from './government/GovernmentDashboard';

import {
  getCurrentUser,
  logoutAccount,
} from './services/authService';

import {
  clearAccessToken,
  getAccessToken,
  storeAccessToken,
} from './services/authSession';

const navigationItems = [
  { id: 'overview', label: 'Overview' },
 
  { id: 'report', label: 'Report emergency' },
  { id: 'assistance', label: 'Request assistance' },
  { id: 'tracking', label: 'My requests' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'safety', label: 'Safety & Precautions' },
  { id: 'profile', label: 'Profile' },
  { id: 'government-access', label: 'Government Access' },
  { id: 'account', label: 'Account' },
];

const allowedRoles = ['PUBLIC', 'AUTHORITY', 'ADMIN'];

function getPortalForRole(role) {
  if (role === 'PUBLIC') return 'public';

  if (role === 'AUTHORITY' || role === 'ADMIN') {
    return 'government';
  }

  return null;
}

function App() {
  const [activeSection, setActiveSection] = useState('overview');

  const [selectedPortal, setSelectedPortal] = useState(null);
  const [applicationFlow, setApplicationFlow] = useState(false);

  const [auth, setAuth] = useState({
    loading: true,
    user: null,
    profile: null,
    error: null,
  });

  // Restore an existing session when the application opens.
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

        if (!allowedRoles.includes(profile?.role)) {
          throw new Error(
            'Your account does not have access to this portal.'
          );
        }

        setSelectedPortal(getPortalForRole(profile.role));

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

        setSelectedPortal(null);

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

  // Refresh the role when an application is approved or revoked.
  const refreshAuthenticatedUser = useCallback(async () => {
    const accessToken = getAccessToken();

    if (!accessToken) {
      return null;
    }

    try {
      const { user, profile } = await getCurrentUser(accessToken);

      // Ignore a response from a session that was signed out or replaced.
      if (getAccessToken() !== accessToken) return null;

      if (!allowedRoles.includes(profile?.role)) {
        const error = new Error('Your account does not have access to this portal.');
        error.code = 'INVALID_PROFILE';
        throw error;
      }

      setSelectedPortal(getPortalForRole(profile.role));

      setAuth({
        loading: false,
        user,
        profile,
        error: null,
      });

      return { user, profile };
    } catch (error) {
      if (getAccessToken() !== accessToken) return null;
      if (error.status === 401 || error.status === 403 || error.code === 'INVALID_PROFILE') {
        clearAccessToken();
        setSelectedPortal(null);
        setAuth({ loading: false, user: null, profile: null, error });
        throw error;
      }
      setAuth((current) => ({
        ...current,
        loading: false,
        error,
      }));

      throw error;
    }
  }, []);

  // Keep both portals in sync with approvals, revocations and expired sessions.
  useEffect(() => {
    if (!auth.user) return;
    let refreshing = false;
    const refresh = async () => {
      if (refreshing || document.visibilityState === 'hidden') return;
      refreshing = true;
      try { await refreshAuthenticatedUser(); }
      catch { /* Application pages show request errors; transient failures retain the session. */ }
      finally { refreshing = false; }
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const interval = window.setInterval(refresh, 60000);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(interval);
    };
  }, [auth.user?.id, refreshAuthenticatedUser]);

  // Verify login and ensure the account belongs to the selected portal.
  async function handleAuthenticated(accessToken) {
    try {
      const { user, profile } = await getCurrentUser(accessToken);

      if (!allowedRoles.includes(profile?.role)) {
        throw new Error(
          'Your account does not have access to this portal.'
        );
      }

      const accountPortal = getPortalForRole(profile.role);

      if (
        selectedPortal === 'government' &&
        accountPortal !== 'government'
      ) {
        throw new Error(
          'This account does not have Government Portal access.'
        );
      }

      if (
        selectedPortal === 'public' &&
        accountPortal !== 'public'
      ) {
        throw new Error(
          'Please use the Government Portal for this account.'
        );
      }

      // Store the session only after verifying the role.
      storeAccessToken(accessToken);

      setSelectedPortal(accountPortal);

      setAuth({
        loading: false,
        user,
        profile,
        error: null,
      });

      setActiveSection('overview');
    } catch (error) {
      clearAccessToken();
      throw error;
    }
  }

  // Log out and return to the Welcome Page.
  async function handleLogout() {
    const accessToken = getAccessToken();

    try {
      if (accessToken) {
        await logoutAccount(accessToken);
      }
    } catch (error) {
      console.error('Server logout failed:', error);
    } finally {
      clearAccessToken();

      setAuth({
        loading: false,
        user: null,
        profile: null,
        error: null,
      });

      setActiveSection('overview');
      setSelectedPortal(null);
      setApplicationFlow(false);
    }
  }

  const userRole = auth.profile?.role;

  // Wait while checking the saved session.
  if (auth.loading) {
    return (
      <div className="page-container">
        Checking your session...
      </div>
    );
  }

  // Keep applicants in the existing application flow while their role is PUBLIC.
  if (auth.user && applicationFlow && auth.profile?.role === 'PUBLIC') {
    return (
      <main className="page-container" style={{ minHeight: '100vh', paddingTop: '24px' }}>
        <button
          type="button"
          className="nav-link"
          onClick={() => {
            setApplicationFlow(false);
            setActiveSection('overview');
          }}
          style={{ marginBottom: '24px' }}
        >
          Back to Public Dashboard
        </button>
        <GovernmentAccess
          auth={auth}
          onAuthRefresh={refreshAuthenticatedUser}
          onOpenAccount={() => {
            setApplicationFlow(false);
            setActiveSection('account');
          }}
        />
      </main>
    );
  }

  // Show Welcome Page before selecting a portal.
  if (!auth.user && !selectedPortal) {
    return (
      <WelcomePage
        onSelectPortal={(portal) => {
          setApplicationFlow(false);
          setSelectedPortal(portal === 'government' ? 'government-landing' : portal);
        }}
      />
    );
  }

  // Government users choose sign-in or the application flow before login.
  if (!auth.user && selectedPortal === 'government-landing') {
    return (
      <GovernmentPortalLanding
        onSignIn={() => {
          setApplicationFlow(false);
          setSelectedPortal('government');
        }}
        onApply={() => {
          setApplicationFlow(true);
          setSelectedPortal('public');
        }}
        onBack={() => {
          setApplicationFlow(false);
          setSelectedPortal(null);
        }}
      />
    );
  }

  // Show login/register for the selected portal.
  if (!auth.user && selectedPortal) {
    return (
      <main
        className="page-container"
        style={{
          minHeight: '100vh',
          paddingTop: '48px',
        }}
      >
        <button
          type="button"
          className="nav-link"
          onClick={() => {
            setSelectedPortal(
              applicationFlow || selectedPortal === 'government'
                ? 'government-landing'
                : null
            );
            setApplicationFlow(false);
          }}
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

  // AUTHORITY and ADMIN accounts use the Government Dashboard.
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

  // PUBLIC accounts use the Public Dashboard.
  return (
    <div className="app-shell">
      <AppHeader
        profile={auth.profile}
        onOpenOverview={() => setActiveSection('overview')}
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
              key={item.id}
              type="button"
              aria-current={
                activeSection === item.id ? 'page' : undefined
              }
              className={
                activeSection === item.id
                  ? 'nav-link active'
                  : 'nav-link'
              }
              onClick={() => setActiveSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {activeSection === 'overview' && (
          <DashboardOverview onNavigate={setActiveSection} />
        )}


        {activeSection === 'report' && (
          <EmergencyReportForm
            isAuthenticated={Boolean(auth.profile)}
            onOpenAccount={() => setActiveSection('account')}
          />
        )}

        {activeSection === 'assistance' && (
          <AssistanceRequestForm />
        )}

        {activeSection === 'tracking' && (
          <RequestTracker
            isAuthenticated={Boolean(auth.profile)}
            onOpenAccount={() => setActiveSection('account')}
          />
        )}

        {activeSection === 'alerts' && (
          <AlertsSection />
        )}

        {activeSection === 'safety' && (
          <SafetyPrecautions />
        )}

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
          <AuthPanel
            onAuthenticated={handleAuthenticated}
          />
        )}
      </main>
    </div>
  );
}

export default App;
