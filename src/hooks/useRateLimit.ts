import { useState, useCallback } from 'react';

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

interface RateLimitState {
  attempts: number;
  lastAttempt: number;
  isBlocked: boolean;
  blockUntil: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 60000, // 1 minute
  blockDurationMs: 300000, // 5 minutes
};

export const useRateLimit = (key: string, config: Partial<RateLimitConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [state, setState] = useState<RateLimitState>(() => {
    const stored = localStorage.getItem(`rateLimit_${key}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return {
          attempts: 0,
          lastAttempt: 0,
          isBlocked: false,
          blockUntil: 0,
        };
      }
    }
    return {
      attempts: 0,
      lastAttempt: 0,
      isBlocked: false,
      blockUntil: 0,
    };
  });

  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now();
    
    // Check if currently blocked
    if (state.isBlocked && now < state.blockUntil) {
      return false;
    }
    
    // Check if window has reset or block period has passed
    if ((state.isBlocked && now >= state.blockUntil) || 
        (now - state.lastAttempt > finalConfig.windowMs)) {
      return true; // Don't update state here, let recordAttempt handle it
    }
    
    // Check if under limit
    return state.attempts < finalConfig.maxAttempts;
  }, [state.isBlocked, state.blockUntil, state.lastAttempt, state.attempts, finalConfig]);

  const recordAttempt = useCallback(() => {
    const now = Date.now();
    
    // Reset if window has passed or block period ended
    if ((state.isBlocked && now >= state.blockUntil) || 
        (now - state.lastAttempt > finalConfig.windowMs)) {
      const newState = {
        attempts: 1, // This is the new attempt
        lastAttempt: now,
        isBlocked: false,
        blockUntil: 0,
      };
      setState(newState);
      localStorage.setItem(`rateLimit_${key}`, JSON.stringify(newState));
      return;
    }
    
    const newAttempts = state.attempts + 1;
    let newState: RateLimitState;
    
    if (newAttempts >= finalConfig.maxAttempts) {
      // Block the user
      newState = {
        attempts: newAttempts,
        lastAttempt: now,
        isBlocked: true,
        blockUntil: now + finalConfig.blockDurationMs,
      };
    } else {
      newState = {
        attempts: newAttempts,
        lastAttempt: now,
        isBlocked: false,
        blockUntil: 0,
      };
    }
    
    setState(newState);
    localStorage.setItem(`rateLimit_${key}`, JSON.stringify(newState));
  }, [state, finalConfig, key]);

  const getTimeUntilReset = useCallback((): number => {
    if (state.isBlocked) {
      return Math.max(0, state.blockUntil - Date.now());
    }
    return Math.max(0, finalConfig.windowMs - (Date.now() - state.lastAttempt));
  }, [state, finalConfig]);

  const remainingAttempts = Math.max(0, finalConfig.maxAttempts - state.attempts);
  
  // Calculate canProceed as a computed value, not a function call
  const now = Date.now();
  const canProceed = !(state.isBlocked && now < state.blockUntil) && 
                    (state.attempts < finalConfig.maxAttempts);

  return {
    canProceed,
    recordAttempt,
    remainingAttempts,
    isBlocked: state.isBlocked && now < state.blockUntil,
    timeUntilReset: getTimeUntilReset(),
  };
};