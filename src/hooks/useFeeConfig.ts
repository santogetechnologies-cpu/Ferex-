import { useState, useEffect, useCallback } from 'react';
import { getSystemFeeConfig, fetchSystemFeeConfigAsync, saveSystemFeeConfig, type SystemFeeConfig } from '../lib/api/feeConfig';

export function useFeeConfig() {
  const [config, setConfig] = useState<SystemFeeConfig>(getSystemFeeConfig());

  const refresh = useCallback(() => {
    setConfig(getSystemFeeConfig());
    fetchSystemFeeConfigAsync().then(latest => setConfig(latest));
  }, []);

  useEffect(() => {
    refresh();

    const handleConfigChange = () => {
      setConfig(getSystemFeeConfig());
    };

    window.addEventListener('storage', handleConfigChange);
    window.addEventListener('ferex_fee_config_change', handleConfigChange);
    return () => {
      window.removeEventListener('storage', handleConfigChange);
      window.removeEventListener('ferex_fee_config_change', handleConfigChange);
    };
  }, [refresh]);

  const updateConfig = (newConfig: SystemFeeConfig) => {
    const saved = saveSystemFeeConfig(newConfig);
    setConfig(saved);
    return saved;
  };

  return { config, updateConfig, refresh };
}
