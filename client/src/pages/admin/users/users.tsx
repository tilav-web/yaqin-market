import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/api/api";
import type { AuthRole } from "@/types/auth-role.type";
import { extractErrorMessage, getRoleLabel } from "@/lib/market";

type AdminUser = {
  id: string;
  first_name: string;
  last_name: string;
  auth?: {
    id: string;
    phone?: string | null;
    role: AuthRole;
  } | null;
  stores?: { id: string; name: string }[];
};

const roles: AuthRole[] = ["CUSTOMER", "SELLER", "COURIER", "SUPER_ADMIN"];

export default function AdminUsersPage() {
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => (await api.get<AdminUser[]>("/users")).data,
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: AuthRole }) =>
      (await api.put(`/users/${id}/role`, { role })).data,
    onSuccess: () => {
      toast.success("Rol yangilandi");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Foydalanuvchilar</h1>
        <p className="mt-2 text-sm text-slate-500">
          Rollarni almashtirish va seller/courier onboarding boshqaruvi
        </p>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_24px_80px_-54px_rgba(15,23,42,0.25)]">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-5 py-4">Foydalanuvchi</th>
              <th className="px-5 py-4">Telefon</th>
              <th className="px-5 py-4">Do'kon</th>
              <th className="px-5 py-4">Rol</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-slate-100">
                <td className="px-5 py-4">
                  <div className="font-medium text-slate-950">
                    {user.first_name} {user.last_name}
                  </div>
                  <div className="text-xs text-slate-400">{user.id}</div>
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {user.auth?.phone ? `+998 ${user.auth.phone}` : "Telefon yo'q"}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {user.stores?.map((store) => store.name).join(", ") || "Biriktirilmagan"}
                </td>
                <td className="px-5 py-4">
                  <select
                    value={user.auth?.role ?? "CUSTOMER"}
                    onChange={(event) =>
                      updateRole.mutate({
                        id: user.id,
                        role: event.target.value as AuthRole,
                      })
                    }
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none"
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {getRoleLabel(role)}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
