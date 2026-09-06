import { useState, useEffect, useCallback } from 'react';
import { getDigitalConfig, saveDigitalConfig, resetDigitalConfig, DEFAULT_DIGITAL_CONFIG } from '../lib/api/digitalConfig';
import type { DigitalCustomizationConfig } from '../lib/api/digitalConfig';

export const useDigitalConfig = () => {
  const [config, setConfig] = useState<DigitalCustomizationConfig>(DEFAULT_DIGITAL_CONFIG);
  const [loading, setLoading] = useState<boolean>(true);

  const loadConfig = useCallback(async () => {
    try {
      const data = await getDigitalConfig();
      setConfig(data);
    } catch (err) {
      console.error('Failed to load digital config:', err);
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

    window.addEventListener('ferex_digital_config_change', handleConfigChange);
    window.addEventListener('storage', (e) => {
      if (e.key === 'ferex_digital_customization_config') {
        loadConfig();
      }
    });

    return () => {
      window.removeEventListener('ferex_digital_config_change', handleConfigChange);
    };
  }, [loadConfig]);

  const updateConfig = async (newConfig: DigitalCustomizationConfig) => {
    setLoading(true);
    try {
      const saved = await saveDigitalConfig(newConfig);
      setConfig(saved);
      return saved;
    } finally {
      setLoading(false);
    }
  };

  const resetToDefault = async () => {
    setLoading(true);
    try {
      const reset = await resetDigitalConfig();
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
