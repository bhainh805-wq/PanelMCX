import { useState, useEffect, useCallback, useRef } from 'react';
import type { ServerStatusInfo } from '@/lib/serverStatus';

interface UseServerStatusOptions {
  /**
   * Polling interval in milliseconds
   * @default 3000
   */
  pollInterval?: number;
  
  /**
   * Server port to check
   * @default 25565
   */
  port?: number;
  
  /**
   * Whether to start polling automatically
   * @default true
   */
  autoStart?: boolean;
}

interface UseServerStatusReturn {
  /**
   * Current server status info
   */
  status: ServerStatusInfo | null;
  
  /**
   * Whether the status is currently being fetched
   */
  loading: boolean;
  
  /**
   * Error message if status check failed
   */
  error: string | null;
  
  /**
   * Manually refresh the status
   */
  refresh: () => Promise<void>;
  
  /**
   * Start polling
   */
  startPolling: () => void;
  
  /**
   * Stop polling
   */
  stopPolling: () => void;
  
  /**
   * Whether polling is active
   */
  isPolling: boolean;
}

/**
 * React hook for checking Minecraft server status
 * 
 * @example
 * ```tsx
 * const { status, loading, error, refresh } = useServerStatus({
 *   pollInterval: 5000,
 *   port: 25565
 * });
 * 
 * if (loading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error}</div>;
 * 
 * return (
 *   <div>
 *     Server is {status?.status}
 *     <button onClick={refresh}>Refresh</button>
 *   </div>
 * );
 * ```
 */
export function useServerStatus(options: UseServerStatusOptions = {}): UseServerStatusReturn {
  const {
    pollInterval = 3000,
    port = 25565,
    autoStart = true,
  } = options;
  
  const [status, setStatus] = useState<ServerStatusInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(autoStart);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef<boolean>(true);
  
  /**
   * Fetch server status from API
   */
  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/server/status?port=${port}`, {
        cache: 'no-store',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const data: ServerStatusInfo = await response.json();
      
      if (mountedRef.current) {
        setStatus(data);
        setError(null);
      }
    } catch (err) {
      console.error('[useServerStatus] Error fetching status:', err);
      
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch status');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [port]);
  
  /**
   * Start polling
   */
  const startPolling = useCallback(() => {
    setIsPolling(true);
  }, []);
  
  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    setIsPolling(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  
  /**
   * Manual refresh
   */
  const refresh = useCallback(async () => {
    await fetchStatus();
  }, [fetchStatus]);
  
  // Set up polling
  useEffect(() => {
    if (!isPolling) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    
    // Initial fetch
    fetchStatus();
    
    // Set up interval
    intervalRef.current = setInterval(() => {
      fetchStatus();
    }, pollInterval);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPolling, pollInterval, fetchStatus]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  
  return {
    status,
    loading,
    error,
    refresh,
    startPolling,
    stopPolling,
    isPolling,
  };
}
