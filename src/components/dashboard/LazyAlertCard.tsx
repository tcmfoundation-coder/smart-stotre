'use client';

import dynamic from 'next/dynamic';
import { CardSkeleton } from '@/components/loading/CardSkeleton';

export const AlertCard = dynamic(
  () => import('@/components/alert-card').then((mod) => mod.AlertCard),
  {
    loading: () => <CardSkeleton />,
    ssr: false,
  }
);
