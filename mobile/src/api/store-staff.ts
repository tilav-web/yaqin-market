import { apiClient } from './client';

export type StaffRole = 'OWNER' | 'MANAGER' | 'OPERATOR' | 'PACKER' | 'COURIER';

export type StoreStaff = {
  id: string;
  store_id: string;
  user_id: string;
  role: StaffRole;
  is_active: boolean;
  hired_at: string | null;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    auth?: { phone?: string | null } | null;
  };
};

export type StoreStaffInvitation = {
  id: string;
  store_id: string;
  invitee_id: string;
  inviter_id: string | null;
  role: StaffRole;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  message: string | null;
  expires_at: string;
  createdAt: string;
  store?: { id: string; name: string; logo?: string };
  invitee?: {
    id: string;
    first_name: string;
    last_name: string;
    auth?: { phone?: string | null } | null;
  };
  inviter?: { id: string; first_name: string; last_name: string } | null;
};

export type UserSearchResult = {
  id: string;
  first_name: string;
  last_name: string;
  auth?: { phone?: string | null } | null;
};

export const staffApi = {
  // Seller tomoni
  searchUsers: (q: string, storeId: string) =>
    apiClient
      .get<UserSearchResult[]>('/store-staff/search-users', {
        params: { q, store_id: storeId },
      })
      .then((r) => r.data),

  invite: (data: {
    store_id: string;
    invitee_id: string;
    role: StaffRole;
    message?: string;
  }) => apiClient.post('/store-staff/invitations', data).then((r) => r.data),

  cancelInvitation: (invitationId: string) =>
    apiClient
      .delete(`/store-staff/invitations/${invitationId}`)
      .then((r) => r.data),

  listStoreInvitations: (storeId: string) =>
    apiClient
      .get<StoreStaffInvitation[]>(`/store-staff/invitations/store/${storeId}`)
      .then((r) => r.data),

  listStoreStaff: (storeId: string) =>
    apiClient
      .get<StoreStaff[]>(`/store-staff/stores/${storeId}`)
      .then((r) => r.data),

  updateRole: (storeId: string, userId: string, role: StaffRole) =>
    apiClient
      .put(`/store-staff/stores/${storeId}/staff/${userId}/role`, { role })
      .then((r) => r.data),

  removeStaff: (storeId: string, userId: string) =>
    apiClient
      .delete(`/store-staff/stores/${storeId}/staff/${userId}`)
      .then((r) => r.data),

  // User (invitee) tomoni
  myInvitations: () =>
    apiClient
      .get<StoreStaffInvitation[]>('/store-staff/invitations/my')
      .then((r) => r.data),

  respond: (invitationId: string, action: 'ACCEPT' | 'REJECT') =>
    apiClient
      .post(`/store-staff/invitations/${invitationId}/respond`, { action })
      .then((r) => r.data),

  myStores: () =>
    apiClient.get<StoreStaff[]>('/store-staff/my-stores').then((r) => r.data),
};
