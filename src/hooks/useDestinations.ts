import { useState, useEffect, useCallback } from 'react';
import {
  getDestinations,
  createDestination,
  updateDestination,
  deleteDestination,
  clearAllDestinations,
  type DestinationItem
} from '../lib/api/destinations';

export function useDestinations() {
  const [destinations, setDestinations] = useState<DestinationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDestinations = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const data = await getDestinations();
      setDestinations(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch destinations');
      if (!silent) setDestinations([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDestinations();

    const handleChange = () => {
      fetchDestinations(true);
    };

    window.addEventListener('ferex_destinations_change', handleChange);
    window.addEventListener('storage', handleChange);
    return () => {
      window.removeEventListener('ferex_destinations_change', handleChange);
      window.removeEventListener('storage', handleChange);
    };
  }, [fetchDestinations]);

  const addDestination = async (payload: Omit<DestinationItem, 'id' | 'created_at' | 'updated_at'>) => {
    const created = await createDestination(payload);
    setDestinations(prev => [created, ...prev.filter(d => d.id !== created.id)]);
    return created;
  };

  const editDestination = async (id: string, payload: Partial<DestinationItem>) => {
    const updated = await updateDestination(id, payload);
    if (updated) {
      setDestinations(prev => prev.map(d => d.id === id ? updated : d));
    }
    return updated;
  };

  const removeDestination = async (id: string, name?: string) => {
    setDestinations(prev => prev.filter(d => d.id !== id && (!name || d.name.toLowerCase() !== name.toLowerCase())));
    await deleteDestination(id, name);
  };

  const clearAll = async () => {
    setDestinations([]);
    await clearAllDestinations();
  };

  return {
    destinations,
    loading,
    error,
    refresh: fetchDestinations,
    addDestination,
    editDestination,
    removeDestination,
    clearAll,
  };
}
