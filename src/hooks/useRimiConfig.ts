import { useState, useEffect, useCallback } from 'react';
import { getRimiConfig, saveRimiConfig, resetRimiConfig, DEFAULT_RIMI_CONFIG } from '../lib/api/rimiConfig';
import type { RimiCustomizationConfig } from '../lib/api/rimiConfig';

export const useRimiConfig = () => {
  const [config, setConfig] = useState<RimiCustomizationConfig>(DEFAULT_RIMI_CONFIG);
  const [loading, setLoading] = useState<boolean>(true);

  const loadConfig = useCallback(async () => {
    try {
      const data = await getRimiConfig();
      setConfig(data);
    } catch (err) {
      console.error('Failed to load rimi config:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();

    const handleConfigChange = (e: any) => {
      if (e.detail) {
        setConfig(e.detail);
      } else {
        loadConfig();
      }
    };

    window.addEventListener('ferex_rimi_config_change', handleConfigChange);
    window.addEventListener('storage', (e) => {
      if (e.key === 'ferex_rimi_customization_config') {
        loadConfig();
      }
    });

    return () => {
      window.removeEventListener('ferex_rimi_config_change', handleConfigChange);
    };
  }, [loadConfig]);

  const updateConfig = async (newConfig: RimiCustomizationConfig) => {
    setLoading(true);
    try {
      const saved = await saveRimiConfig(newConfig);
      setConfig(saved);
      return saved;
    } finally {
      setLoading(false);
    }
  };

  const resetToDefault = async () => {
    setLoading(true);
    try {
      const reset = await resetRimiConfig();
      setConfig(reset);
      return reset;
    } finally {
      setLoading(false);
    }
  };

  return {
    config,
    loading,
    updateConfig,
    resetToDefault,
    refetch: loadConfig
  };
};
