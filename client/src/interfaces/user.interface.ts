export interface User {
  id: string;
  first_name: string;
  last_name: string;
  createdAt: string;
  updatedAt: string;
  auth_id?: string | null;
}
