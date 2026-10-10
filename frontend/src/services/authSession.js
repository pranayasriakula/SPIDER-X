const ACCESS_TOKEN_KEY = 'spider-x.access-token';

// Authentication endpoint schemas are not yet available in this checkout.
// A future login flow should store only the access_token returned by that documented endpoint.
export function getAccessToken() { return window.sessionStorage.getItem(ACCESS_TOKEN_KEY); }
export function storeAccessToken(accessToken) { window.sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken); }
export function clearAccessToken() { window.sessionStorage.removeItem(ACCESS_TOKEN_KEY); }

