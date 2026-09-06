import { auth } from './firebase';

export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  let token = 'dev-admin-token';
  if (user) {
    token = await user.getIdToken();
  } else {
    token = localStorage.getItem('edusphere_auth_token') || 'dev-admin-token';
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(input, { ...init, headers });
}
