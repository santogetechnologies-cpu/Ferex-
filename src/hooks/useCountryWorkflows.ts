import { useState, useEffect, useCallback } from 'react';
import {
  getCountryWorkflows, getWorkflowForCountry, saveCountryWorkflow, deleteCountryWorkflow
} from '../lib/api/countryWorkflows';
import type { CountryWorkflowConfig } from '../lib/types';

export function useCountryWorkflows() {
  const [workflows, setWorkflows] = useState<CountryWorkflowConfig[]>(getCountryWorkflows());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    setWorkflows(getCountryWorkflows());
  }, []);

  useEffect(() => {
    refresh();

    const handleChange = () => {
      refresh();
    };

    window.addEventListener('ferex_country_workflow_change', handleChange);
    window.addEventListener('storage', handleChange);
    return () => {
      window.removeEventListener('ferex_country_workflow_change', handleChange);
      window.removeEventListener('storage', handleChange);
    };
  }, [refresh]);

  const saveWorkflow = (config: CountryWorkflowConfig) => {
    const saved = saveCountryWorkflow(config);
    setWorkflows(getCountryWorkflows());
    return saved;
  };

  const removeWorkflow = (id: string) => {
    deleteCountryWorkflow(id);
    setWorkflows(getCountryWorkflows());
  };

  return {
    workflows,
    loading,
    refresh,
    saveWorkflow,
    removeWorkflow,
    getWorkflowForCountry
  };
}
