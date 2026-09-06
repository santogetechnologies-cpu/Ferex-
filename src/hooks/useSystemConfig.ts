import { useState, useEffect, useCallback } from 'react';
import { getSystemConfig, saveSystemConfig, resetSystemConfig, DEFAULT_SYSTEM_CONFIG } from '../lib/api/systemConfig';
import type { SystemCustomizationConfig } from '../types';

export const useSystemConfig = () => {
  const [config, setConfig] = useState<SystemCustomizationConfig>(DEFAULT_SYSTEM_CONFIG);
  const [loading, setLoading] = useState<boolean>(true);

  const loadConfig = useCallback(async () => {
    try {
      const data = await getSystemConfig();
      setConfig(data);
    } catch (err) {
      console.error('Failed to load system config:', err);
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

    window.addEventListener('ferex_system_config_change', handleConfigChange);
    window.addEventListener('storage', (e) => {
      if (e.key === 'ferex_system_customization_config') {
        loadConfig();
      }
    });

    return () => {
      window.removeEventListener('ferex_system_config_change', handleConfigChange);
    };
  }, [loadConfig]);

  const updateConfig = async (newConfig: SystemCustomizationConfig) => {
    setLoading(true);
    try {
      const saved = await saveSystemConfig(newConfig);
      setConfig(saved);
      return saved;
    } finally {
      setLoading(false);
    }
  };

  const resetToDefault = async () => {
    setLoading(true);
    try {
      const reset = await resetSystemConfig();
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
