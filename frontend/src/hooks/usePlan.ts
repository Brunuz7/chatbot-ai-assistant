import { useCallback, useEffect, useState } from 'react';
import { PlanService } from '../services/PlanService';
import type { UserPlanSummary } from '../types/plan';
import { useAuthProfile } from '../contexts/AuthProfileContext';

export function usePlan() {
  const { profile } = useAuthProfile();
  const [plan, setPlan] = useState<UserPlanSummary | null>(profile?.plan ?? null);
  const [loading, setLoading] = useState(!profile?.plan);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await PlanService.getMine();
      setPlan(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile?.plan) {
      setPlan(profile.plan);
      setLoading(false);
    }
  }, [profile?.plan]);

  const hasFeature = useCallback(
    (key: keyof UserPlanSummary['flags']) => plan?.flags[key] === true,
    [plan],
  );

  const isAtLimit = useCallback(
    (resource: keyof UserPlanSummary['usage']) => {
      if (!plan) return false;
      const limit = plan.limits[resource];
      if (limit === null) return false;
      return plan.usage[resource] >= limit;
    },
    [plan],
  );

  const limitLabel = useCallback(
    (resource: keyof UserPlanSummary['usage']) => {
      if (!plan) return '';
      const limit = plan.limits[resource];
      const used = plan.usage[resource];
      if (limit === null) return `${used} / Ilimitado`;
      return `${used} / ${limit}`;
    },
    [plan],
  );

  return {
    plan,
    loading,
    refresh,
    hasFeature,
    isAtLimit,
    limitLabel,
  };
}
