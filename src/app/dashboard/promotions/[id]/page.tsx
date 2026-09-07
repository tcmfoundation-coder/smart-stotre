'use client';

import { use } from 'react';
import PromotionForm from '../promotion-form';

export default function EditPromotionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PromotionForm mode="edit" promotionId={id} />;
}
