"use client";

import React, { useState, useEffect } from 'react';
import { Settings as SettingsComponent } from '../../../../screens/Settings';
import { api } from '@/utils/api';

export default function SettingsPage() {
  const [aggregators, setAggregators] = useState<string[]>([]);

  useEffect(() => {
    const fetchAggregators = async () => {
      try {
        const data = await api.getAggregators('');
        if (Array.isArray(data)) {
          setAggregators(data);
        } else if (data && Array.isArray(data.aggregators)) {
          setAggregators(data.aggregators);
        }
      } catch (err) {
        console.error('Failed to fetch aggregators', err);
      }
    };
    fetchAggregators();
  }, []);

  const handleSaveAggregators = async (list: string[]) => {
    try {
      await api.updateAggregators('', list);
      setAggregators(list);
    } catch (err) {
      console.error('Failed to save aggregators', err);
    }
  };

  return (
    <SettingsComponent
      aggregators={aggregators}
      onSaveAggregators={handleSaveAggregators}
    />
  );
}
