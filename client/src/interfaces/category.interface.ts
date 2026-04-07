import type { TName } from '@/lib/i18n';

export interface ICategory {
  id: string;
  name: TName;
  slug: string;
  image?: string | null;
  order_number: number;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
}
