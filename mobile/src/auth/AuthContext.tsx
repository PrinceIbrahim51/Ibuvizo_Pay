import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { configureSession } from '@/api/client';
import { authApi, userApi } from '@/api/endpoints';
import type { Profile, TokenResponse } from '@/api/types';
import * as session from './secureSession';

type Status = 'loading' | 'signedOut' | 'signedIn' | 'locked';

type AuthCtx = {
  status: Status;
  profile: Profile | null;
  requestOtp: (phone: string, purpose: 'REGISTER' | 'LOGIN' | 'RESET_MPIN') => Promise<string>;
  login: (phone: string, challengeId: string, otp: string, mpin: string) => Promise<void>;
  register: (phone: string, challengeId: string, otp: string, fullName: string, mpin: string) => Promise<void>;
  unlockWithBiometrics: () => Promise<boolean>;
  lock: () => void;
  resume: () => void;
  logout: () => Promise<void>;
  logoutEverywhere: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setProfile: (p: Profile) => void;
  setBiometric: (on: boolean) => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);
  const accessToken = useRef<string | null>(null);
  const refreshToken = useRef<string | null>(null);

  const signOutLocal = useCallback(async () => {
    accessToken.current = null;
    refreshToken.current = null;
    setProfile(null);
    await session.clearSession();
    setStatus('signedOut');
  }, []);

  const applyTokens = useCallback(async (t: TokenResponse) => {
    accessToken.current = t.accessToken;
    refreshToken.current = t.refreshToken;
    await session.saveRefreshToken(t.refreshToken);
  }, []);

  const doRefresh = useCallback(async (): Promise<string | null> => {
    const rt = refreshToken.current;
    if (!rt) return null;
    try {
      const t = await authApi.refresh(rt, await session.deviceId());
      await applyTokens(t);
      return t.accessToken;
    } catch {
      return null;
    }
  }, [applyTokens]);

  useEffect(() => {
    configureSession({
      getAccessToken: () => accessToken.current,
      refresh: doRefresh,
      onSessionExpired: () => {
        signOutLocal();
      },
    });
  }, [doRefresh, signOutLocal]);

  const startSession = useCallback(async (t: TokenResponse) => {
    await applyTokens(t);
    setProfile(await userApi.me());
    setStatus('signedIn');
  }, [applyTokens]);

  // Silent restore on launch (non-biometric sessions only; biometric sessions wait for the user to unlock).
  useEffect(() => {
    (async () => {
      try {
        const rt = await session.readRefreshToken();
        if (rt) {
          const t = await authApi.refresh(rt, await session.deviceId());
          await startSession(t);
          return;
        }
      } catch {
        await session.clearSession();
      }
      setStatus('signedOut');
    })();
  }, [startSession]);

  const value = useMemo<AuthCtx>(() => ({
    status,
    profile,
    requestOtp: async (phone, purpose) => {
      const r = await authApi.requestOtp(phone, purpose);
      await session.rememberPhone(phone);
      return r.challengeId;
    },
    login: async (phone, challengeId, otp, mpin) => {
      const t = await authApi.login({ phone, challengeId, otp, mpin, deviceId: await session.deviceId() });
      await startSession(t);
    },
    register: async (phone, challengeId, otp, fullName, mpin) => {
      const t = await authApi.register({ phone, challengeId, otp, fullName, mpin, deviceId: await session.deviceId() });
      await startSession(t);
    },
    unlockWithBiometrics: async () => {
      const rt = await session.readBiometricRefreshToken();
      if (!rt) return false;
      try {
        const t = await authApi.refresh(rt, await session.deviceId());
        await startSession(t);
        return true;
      } catch {
        await signOutLocal();
        return false;
      }
    },
    lock: () => {
      // Drop the in-memory access token; the refresh token stays in secure storage behind biometrics.
      accessToken.current = null;
      setStatus((s) => (s === 'signedIn' ? 'locked' : s));
    },
    resume: () => setStatus((s) => (s === 'locked' ? 'signedIn' : s)),
    logout: async () => {
      const rt = refreshToken.current;
      if (rt) await authApi.logout(rt).catch(() => {});
      await signOutLocal();
    },
    logoutEverywhere: async () => {
      await authApi.logoutAll().catch(() => {});
      await signOutLocal();
    },
    refreshProfile: async () => setProfile(await userApi.me()),
    setProfile,
    setBiometric: async (on) => session.setBiometricEnabled(on, refreshToken.current),
  }), [status, profile, startSession, signOutLocal]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
