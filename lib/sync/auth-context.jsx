'use client';

import { toast } from 'sonner';
import { useMemo, useState, useEffect, useContext, useCallback, createContext } from 'react';

import {
  keysFromSeed,
  signChallenge,
  bytesToBase64,
  base64ToBuffer,
  bytesToBase64Url,
  keysFromMnemonic,
  encryptData,
  keysFromCredentialId,
} from './crypto';
import {
  getUser,
  editUser,
  loginAccount,
  removeSession,
  registerAccount,
  getLoginChallengeToken,
  getRegisterChallengeToken,
} from './api';
import { syncAllData, setupRealtimeSync } from './syncer';
import { getBackendUrl, AUTH_STORAGE_KEY, setCustomBackendUrl } from './config';

// ----------------------------------------------------------------------

export const SyncAuthContext = createContext(null);

export function useSyncAuth() {
  const context = useContext(SyncAuthContext);
  if (!context) {
    throw new Error('useSyncAuth must be used inside a SyncAuthProvider');
  }
  return context;
}

// ----------------------------------------------------------------------

export function SyncAuthProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [backendUrl, setBackendUrlState] = useState(getBackendUrl());
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'synced' | 'error'
  const [isInitialized, setIsInitialized] = useState(false);

  // Load persisted account on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.token && parsed?.userId) {
          setAccount(parsed);
        }
      }
    } catch (err) {
      console.warn('Failed to load sync account from storage:', err);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save account to localStorage on change
  const saveAccount = useCallback((acc) => {
    setAccount(acc);
    try {
      if (acc) {
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(acc));
      } else {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (err) {
      console.warn('Failed to save sync account to storage:', err);
    }
  }, []);

  // Live real-time bidirectional sync
  useEffect(() => {
    if (!account?.token) return;
    const cleanup = setupRealtimeSync(
      () => account,
      () => backendUrl
    );
    return cleanup;
  }, [account, backendUrl]);

  // Background restore / validation on init
  useEffect(() => {
    if (!isInitialized || !account?.token) return;

    let isMounted = true;
    (async () => {
      try {
        setSyncStatus('syncing');
        const userRes = await getUser(backendUrl, account.token);
        if (userRes?.user && isMounted) {
          const updated = {
            ...account,
            profile: userRes.user.profile || account.profile,
            nickname: userRes.user.nickname || account.nickname,
          };
          saveAccount(updated);
        }
        await syncAllData(account, backendUrl);
        if (isMounted) setSyncStatus('synced');
      } catch (err) {
        if (err?.status === 401 || err?.status === 403) {
          console.warn('Sync session expired. Disconnecting.');
          saveAccount(null);
          toast.info('Sync session expired. Please sign in again.');
        } else {
          console.warn('Sync server check warning:', err);
        }
        if (isMounted) setSyncStatus('error');
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isInitialized, account?.token, backendUrl, saveAccount]);

  // Login handler
  const login = useCallback(
    async ({ mnemonic, credentialId, deviceName }) => {
      if (!mnemonic && !credentialId) {
        throw new Error('Please provide your secret passphrase or use a passkey');
      }
      const device = (deviceName && deviceName.trim()) || 'Web Browser';
      setSyncStatus('syncing');

      try {
        const keys = credentialId
          ? await keysFromCredentialId(credentialId)
          : await keysFromMnemonic(mnemonic);

        const publicKeyBase64Url = bytesToBase64Url(keys.publicKey);
        const { challenge } = await getLoginChallengeToken(backendUrl, publicKeyBase64Url);
        const signature = await signChallenge(keys, challenge);

        const encryptedDevice = await encryptData(device, keys.seed);

        const loginResult = await loginAccount(backendUrl, {
          publicKey: publicKeyBase64Url,
          challenge: {
            code: challenge,
            signature,
          },
          device: encryptedDevice,
        });

        const userMe = await getUser(backendUrl, loginResult.token);

        const newAccount = {
          token: loginResult.token,
          userId: userMe?.user?.id || loginResult.session?.userId,
          sessionId: loginResult.session?.id,
          deviceName: device,
          profile: userMe?.user?.profile || {
            colorA: '#00A76F',
            colorB: '#00B8D9',
            icon: 'solar:user-bold',
          },
          nickname: userMe?.user?.nickname || 'Movie Lover',
          seed: bytesToBase64(keys.seed),
          mnemonic: mnemonic || null,
        };

        saveAccount(newAccount);

        // Sync all bookmarks & history
        await syncAllData(newAccount, backendUrl);
        setSyncStatus('synced');
        toast.success(`Welcome back, ${newAccount.nickname}! Synced with cloud.`);
        return newAccount;
      } catch (err) {
        setSyncStatus('error');
        console.error('Login failed:', err);
        throw err;
      }
    },
    [backendUrl, saveAccount]
  );

  // Register handler
  const register = useCallback(
    async ({ mnemonic, credentialId, deviceName, nickname, profile, captchaToken }) => {
      if (!mnemonic && !credentialId) {
        throw new Error('Please provide or generate a 12-word passphrase');
      }
      const device = (deviceName && deviceName.trim()) || 'Web Browser';
      const userNick = (nickname && nickname.trim()) || 'Movie Fan';
      const userProfile = profile || {
        colorA: '#00A76F',
        colorB: '#00B8D9',
        icon: 'solar:user-bold',
      };

      setSyncStatus('syncing');

      try {
        const { challenge } = await getRegisterChallengeToken(backendUrl, captchaToken);

        const keys = credentialId
          ? await keysFromCredentialId(credentialId)
          : await keysFromMnemonic(mnemonic);

        const signature = await signChallenge(keys, challenge);
        const publicKeyBase64Url = bytesToBase64Url(keys.publicKey);
        const encryptedDevice = await encryptData(device, keys.seed);

        const registerResult = await registerAccount(backendUrl, {
          publicKey: publicKeyBase64Url,
          challenge: {
            code: challenge,
            signature,
          },
          device: encryptedDevice,
          profile: userProfile,
        });

        const newAccount = {
          token: registerResult.token,
          userId: registerResult.user?.id || registerResult.session?.userId,
          sessionId: registerResult.session?.id,
          deviceName: device,
          profile: userProfile,
          nickname: userNick,
          seed: bytesToBase64(keys.seed),
          mnemonic: mnemonic || null,
        };

        // Update nickname if custom
        if (userNick && userNick !== 'Movie Fan') {
          await editUser(backendUrl, newAccount, { nickname: userNick }).catch(() => {});
        }

        saveAccount(newAccount);

        // Sync local bookmarks and history to newly created account
        await syncAllData(newAccount, backendUrl);
        setSyncStatus('synced');
        toast.success(`Account created! Welcome, ${userNick}!`);
        return newAccount;
      } catch (err) {
        setSyncStatus('error');
        console.error('Registration failed:', err);
        throw err;
      }
    },
    [backendUrl, saveAccount]
  );

  // Logout (removes remote session & clears account)
  const logout = useCallback(async () => {
    if (account?.token && account?.sessionId) {
      try {
        await removeSession(backendUrl, account.token, account.sessionId);
      } catch (err) {
        console.warn('Error deleting remote session:', err);
      }
    }
    saveAccount(null);
    setSyncStatus('idle');
    toast.success('Logged out from sync backend.');
  }, [account, backendUrl, saveAccount]);

  // Disconnect without removing session
  const disconnect = useCallback(() => {
    saveAccount(null);
    setSyncStatus('idle');
    toast.info('Cloud sync disconnected.');
  }, [saveAccount]);

  // Trigger manual sync
  const syncNow = useCallback(async () => {
    if (!account?.token) return;
    setSyncStatus('syncing');
    try {
      await syncAllData(account, backendUrl);
      setSyncStatus('synced');
      toast.success('Cloud sync complete!');
    } catch (err) {
      setSyncStatus('error');
      toast.error('Sync failed. Please check connection.');
      throw err;
    }
  }, [account, backendUrl]);

  // Change backend URL
  const updateBackendUrl = useCallback(
    (newUrl) => {
      setCustomBackendUrl(newUrl);
      const effective = getBackendUrl();
      setBackendUrlState(effective);
      toast.success(`Backend updated to: ${effective}`);
    },
    []
  );

  // Edit profile (nickname, profile colors/icon)
  const updateProfile = useCallback(
    async ({ nickname: newNick, profile: newProf }) => {
      if (!account?.token) return;
      const updatedAccount = {
        ...account,
        nickname: newNick !== undefined ? newNick : account.nickname,
        profile: newProf !== undefined ? newProf : account.profile,
      };
      saveAccount(updatedAccount);

      try {
        await editUser(backendUrl, account, {
          nickname: newNick,
          profile: newProf,
        });
        toast.success('Profile updated!');
      } catch (err) {
        console.warn('Failed to update remote profile:', err);
      }
    },
    [account, backendUrl, saveAccount]
  );

  const value = useMemo(
    () => ({
      account,
      isLoggedIn: Boolean(account?.token),
      backendUrl,
      syncStatus,
      isInitialized,
      login,
      register,
      logout,
      disconnect,
      syncNow,
      updateBackendUrl,
      updateProfile,
    }),
    [
      account,
      backendUrl,
      syncStatus,
      isInitialized,
      login,
      register,
      logout,
      disconnect,
      syncNow,
      updateBackendUrl,
      updateProfile,
    ]
  );

  return <SyncAuthContext.Provider value={value}>{children}</SyncAuthContext.Provider>;
}
