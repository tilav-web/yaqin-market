import { api } from "@/api/api";
import type { TName } from "@/lib/i18n";

export interface IUnit {
  id: number;
  name: TName;
  short_name: TName | null;
}

export type CreateUnitPayload = {
  name: TName;
  short_name?: TName;
};

export type UpdateUnitPayload = {
  name?: TName;
  short_name?: TName;
};

async function findAll() {
  const response = await api.get<IUnit[]>("/units");
  return response.data;
}

async function create(payload: CreateUnitPayload) {
  const response = await api.post<IUnit>("/units", payload);
  return response.data;
}

async function update(id: number, payload: UpdateUnitPayload) {
  const response = await api.patch<IUnit>(`/units/${id}`, payload);
  return response.data;
}

async function remove(id: number) {
  const response = await api.delete<{ success: boolean }>(`/units/${id}`);
  return response.data;
}

export const unitService = {
  findAll,
  create,
  update,
  remove,
};
