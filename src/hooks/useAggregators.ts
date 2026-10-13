"use client";

import { useEffect, useState } from "react";
import { DEFAULT_AGGREGATORS, normalizeAggregators } from "@/lib/aggregators";

export function useAggregators() {
  const [aggregators, setAggregators] = useState<string[]>([...DEFAULT_AGGREGATORS]);
  const [isLoadingAggregators, setIsLoadingAggregators] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/settings/aggregators", { credentials: "include", cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Gagal memuat aggregator")))
      .then((data) => {
        if (active) setAggregators(normalizeAggregators(data?.aggregators));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoadingAggregators(false);
      });

    return () => { active = false; };
  }, []);

  return { aggregators, setAggregators, isLoadingAggregators };
}
