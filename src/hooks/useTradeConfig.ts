import { useState, useEffect, useCallback } from 'react';
import { getTradeConfig, saveTradeConfig, resetTradeConfig, DEFAULT_TRADE_CONFIG } from '../lib/api/tradeConfig';
import type { TradeCustomizationConfig } from '../lib/api/tradeConfig';

export const useTradeConfig = () => {
  const [config, setConfig] = useState<TradeCustomizationConfig>(DEFAULT_TRADE_CONFIG);
  const [loading, setLoading] = useState<boolean>(true);

  const loadConfig = useCallback(async () => {
    try {
      const data = await getTradeConfig();
      setConfig(data);
    } catch (err) {
      console.error('Failed to load trade config:', err);
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

    window.addEventListener('ferex_trade_config_change', handleConfigChange);
    window.addEventListener('storage', (e) => {
      if (e.key === 'ferex_trade_customization_config') {
        loadConfig();
      }
    });

    return () => {
      window.removeEventListener('ferex_trade_config_change', handleConfigChange);
    };
  }, [loadConfig]);

  const updateConfig = async (newConfig: TradeCustomizationConfig) => {
    setLoading(true);
    try {
      const saved = await saveTradeConfig(newConfig);
      setConfig(saved);
      return saved;
    } finally {
      setLoading(false);
    }
  };

  const resetToDefault = async () => {
    setLoading(true);
    try {
      const reset = await resetTradeConfig();
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
