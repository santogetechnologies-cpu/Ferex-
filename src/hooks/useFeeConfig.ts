import { supabase } from '../lib/supabase';
import { useState, useEffect, useCallback } from 'react';
import { getSystemFeeConfig, fetchSystemFeeConfigAsync, saveSystemFeeConfig, type SystemFeeConfig } from '../lib/api/feeConfig';

export function useFeeConfig() {
  const [config, setConfig] = useState<SystemFeeConfig>(getSystemFeeConfig());

  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setConfig(getSystemFeeConfig());
    fetchSystemFeeConfigAsync().then((latest: SystemFeeConfig) => { setConfig(latest); setReady(true); });
  }, []);

  useEffect(() => {
    refresh();

    const handleConfigChange = () => {
      setConfig(getSystemFeeConfig());
    };

    const channel = supabase.channel(`fee-config-${crypto.randomUUID()}`).on('postgres_changes', { event: '*', schema: 'public', table: 'system_config', filter: 'key=eq.fee_config' }, refresh).subscribe();
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', handleConfigChange);
    window.addEventListener('ferex_fee_config_change', handleConfigChange);
    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', handleConfigChange);
      window.removeEventListener('ferex_fee_config_change', handleConfigChange);
    };
  }, [refresh]);

  const updateConfig = (newConfig: Partial<SystemFeeConfig>) => {
    const saved = saveSystemFeeConfig(newConfig);
    setConfig(saved);
    return saved;
  };

  return { ready, config, updateConfig, refresh };
}
