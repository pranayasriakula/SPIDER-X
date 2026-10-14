// DEVELOPMENT/DEMO ONLY — remove this module and its App.jsx integration when
// the real backend authentication flow is ready for local dashboard reviews.
export const DEMO_EMAIL = 'authority@spiderx.local';
export const DEMO_PASSWORD = 'demo123';

const DEMO_SESSION_KEY = 'spider-x-government-demo-session';

const demoAccount = {
  user: { email: DEMO_EMAIL },
  profile: { name: 'Demo Authority', role: 'AUTHORITY' },
};

export const restoreDemoSession = () => {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(DEMO_SESSION_KEY) === 'active' ? demoAccount : null;
};

export const attemptDemoLogin = ({ email, password }) => {
  if (email.trim().toLowerCase() !== DEMO_EMAIL) return { matched: false };
  if (password !== DEMO_PASSWORD) return { matched: true, error: 'The DEVELOPMENT/DEMO password is incorrect.' };

  window.sessionStorage.setItem(DEMO_SESSION_KEY, 'active');
  return { matched: true, account: demoAccount };
};

export const clearDemoSession = () => {
  if (typeof window !== 'undefined') window.sessionStorage.removeItem(DEMO_SESSION_KEY);
};
