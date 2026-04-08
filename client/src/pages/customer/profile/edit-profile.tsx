import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ChevronLeftIcon, User2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type MeResponse = {
  id: string;
  first_name: string;
  last_name: string;
};

export default function EditProfilePage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ first_name: "", last_name: "" });

  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get<MeResponse>("/users/me")).data,
  });

  useEffect(() => {
    if (!me) return;
    setForm({
      first_name: me.first_name ?? "",
      last_name: me.last_name ?? "",
    });
  }, [me]);

  const saveProfile = useMutation({
    mutationFn: (data: { first_name: string; last_name: string }) =>
      api.put("/users/me", data),
    onSuccess: () => {
      toast.success("Profil muvaffaqiyatli yangilandi");
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Profilni yangilashda xatolik",
      );
    },
  });

  return (
    <div className="space-y-4 px-4 pb-28 pt-4">
      <section className="rounded-3xl border border-border bg-card/90 p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)]">
        <div className="flex items-center gap-3">
          <Link
            to="/mobile/profile"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-background text-foreground"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <User2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
                Profilni tahrirlash
              </p>
              <h1 className="text-lg font-semibold text-foreground">
                Редактировать профиль
              </h1>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card/90 p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)]">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Ism (first name)
              </label>
              <Input
                placeholder="Ismingiz"
                value={form.first_name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, first_name: event.target.value }))
                }
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Familiya (last name)
              </label>
              <Input
                placeholder="Familiyangiz"
                value={form.last_name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, last_name: event.target.value }))
                }
              />
            </div>

            <Button
              className="mt-2 h-12 w-full rounded-2xl"
              onClick={() => saveProfile.mutate(form)}
              disabled={saveProfile.isPending || !form.first_name.trim()}
            >
              {saveProfile.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
