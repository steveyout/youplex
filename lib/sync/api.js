'use client';

import { getBackendUrl } from './config';

// ----------------------------------------------------------------------

export function getAuthHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Standard fetch helper for movie-web backend
 */
async function fetchApi(endpoint, options = {}, backendUrl) {
  const base = (backendUrl || getBackendUrl()).replace(/\/+$/, '');
  const url = `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = {
    Accept: 'application/json, text/plain, */*',
    ...options.headers,
  };

  let { body } = options;
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    body,
  });

  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  } else {
    data = await res.text().catch(() => null);
  }

  if (!res.ok) {
    let errorMsg =
      (data && typeof data === 'object' && (data.message || data.error)) ||
      (typeof data === 'string' && data.length < 150 ? data : null);

    if (!errorMsg) {
      const hostname = (() => {
        try {
          return new URL(url).host;
        } catch {
          return 'sync server';
        }
      })();

      if (res.status === 500) {
        errorMsg = `Server error (500) on ${hostname}. The backend database appears to be temporarily offline or restarting.`;
      } else if (res.status === 404) {
        errorMsg = `Endpoint not found (404) on ${hostname}.`;
      } else if (res.status === 401 || res.status === 403) {
        errorMsg = `Authentication rejected (${res.status}).`;
      } else {
        errorMsg = `Request failed with status ${res.status}`;
      }
    }

    const error = new Error(errorMsg);
    error.status = res.status;
    error.data = data;
    error.url = url;
    throw error;
  }

  return data;
}

// ----------------------------------------------------------------------
// Metadata
// ----------------------------------------------------------------------

export async function getBackendMeta(url) {
  const meta = await fetchApi('/meta', { method: 'GET' }, url);
  return {
    ...meta,
    name: meta?.name?.replace(/\\'/g, "'") || '',
    description: meta?.description?.replace(/\\'/g, "'") || '',
  };
}

// ----------------------------------------------------------------------
// Auth & Registration
// ----------------------------------------------------------------------

export async function getRegisterChallengeToken(url, captchaToken) {
  return fetchApi(
    '/auth/register/start',
    {
      method: 'POST',
      body: { captchaToken },
    },
    url
  );
}

export async function registerAccount(url, data) {
  return fetchApi(
    '/auth/register/complete',
    {
      method: 'POST',
      body: {
        namespace: 'movie-web',
        ...data,
      },
    },
    url
  );
}

export async function getLoginChallengeToken(url, publicKey) {
  return fetchApi(
    '/auth/login/start',
    {
      method: 'POST',
      body: { publicKey },
    },
    url
  );
}

export async function loginAccount(url, data) {
  return fetchApi(
    '/auth/login/complete',
    {
      method: 'POST',
      body: {
        namespace: 'movie-web',
        ...data,
      },
    },
    url
  );
}

// ----------------------------------------------------------------------
// User Account & Profile
// ----------------------------------------------------------------------

export async function getUser(url, token) {
  return fetchApi(
    '/users/@me',
    {
      headers: getAuthHeaders(token),
    },
    url
  );
}

export async function editUser(url, account, data) {
  return fetchApi(
    `/users/${account.userId}`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(account.token),
      body: data,
    },
    url
  );
}

export async function deleteUser(url, account) {
  return fetchApi(
    `/users/${account.userId}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(account.token),
    },
    url
  );
}

// ----------------------------------------------------------------------
// Bookmarks
// ----------------------------------------------------------------------

export async function getBookmarks(url, account) {
  return fetchApi(
    `/users/${account.userId}/bookmarks`,
    {
      headers: getAuthHeaders(account.token),
    },
    url
  );
}

export async function addBookmark(url, account, input) {
  return fetchApi(
    `/users/${account.userId}/bookmarks/${input.tmdbId}`,
    {
      method: 'POST',
      headers: getAuthHeaders(account.token),
      body: input,
    },
    url
  );
}

export async function removeBookmark(url, account, tmdbId) {
  return fetchApi(
    `/users/${account.userId}/bookmarks/${tmdbId}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(account.token),
    },
    url
  );
}

export async function importBookmarks(url, account, bookmarks) {
  return fetchApi(
    `/users/${account.userId}/bookmarks`,
    {
      method: 'PUT',
      headers: getAuthHeaders(account.token),
      body: bookmarks,
    },
    url
  );
}

// ----------------------------------------------------------------------
// Progress
// ----------------------------------------------------------------------

export async function getProgress(url, account) {
  return fetchApi(
    `/users/${account.userId}/progress`,
    {
      headers: getAuthHeaders(account.token),
    },
    url
  );
}

export async function setProgress(url, account, input) {
  return fetchApi(
    `/users/${account.userId}/progress/${input.tmdbId}`,
    {
      method: 'PUT',
      headers: getAuthHeaders(account.token),
      body: input,
    },
    url
  );
}

export async function removeProgress(url, account, tmdbId, seasonId, episodeId) {
  return fetchApi(
    `/users/${account.userId}/progress/${tmdbId}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(account.token),
      body: { seasonId, episodeId },
    },
    url
  );
}

export async function importProgress(url, account, items) {
  return fetchApi(
    `/users/${account.userId}/progress/import`,
    {
      method: 'PUT',
      headers: getAuthHeaders(account.token),
      body: items,
    },
    url
  );
}

// ----------------------------------------------------------------------
// Watch History
// ----------------------------------------------------------------------

export async function getWatchHistory(url, account) {
  return fetchApi(
    `/users/${account.userId}/watch-history`,
    {
      headers: getAuthHeaders(account.token),
    },
    url
  );
}

export async function setWatchHistory(url, account, input) {
  return fetchApi(
    `/users/${account.userId}/watch-history/${input.tmdbId}`,
    {
      method: 'PUT',
      headers: getAuthHeaders(account.token),
      body: input,
    },
    url
  );
}

export async function removeWatchHistory(url, account, tmdbId, episodeId, seasonId) {
  return fetchApi(
    `/users/${account.userId}/watch-history/${tmdbId}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(account.token),
      body: { episodeId, seasonId },
    },
    url
  );
}

export async function importWatchHistory(url, account, items) {
  return fetchApi(
    `/users/${account.userId}/watch-history/import`,
    {
      method: 'PUT',
      headers: getAuthHeaders(account.token),
      body: items,
    },
    url
  );
}

// ----------------------------------------------------------------------
// Sessions
// ----------------------------------------------------------------------

export async function getSessions(url, account) {
  return fetchApi(
    `/users/${account.userId}/sessions`,
    {
      headers: getAuthHeaders(account.token),
    },
    url
  );
}

export async function removeSession(url, token, sessionId) {
  return fetchApi(
    `/sessions/${sessionId}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(token),
    },
    url
  );
}
