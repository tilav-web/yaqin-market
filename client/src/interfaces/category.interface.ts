export interface ICategory {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  order_number: number;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
}
