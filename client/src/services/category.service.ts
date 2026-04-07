import axios from "axios";
import { api } from "@/api/api";
import type { ICategory } from "@/interfaces/category.interface";
import type { TName } from "@/lib/i18n";

export type CreateCategoryPayload = {
  name: TName;
  slug?: string;
  image?: string | File;
  order_number?: number;
  is_active?: boolean;
};

export type UpdateCategoryPayload = {
  name?: TName;
  slug?: string;
  image?: string | File;
  order_number?: number;
  is_active?: boolean;
};

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[] }
      | undefined;
    const message = data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
    if (error.response?.status === 0) return "Server bilan aloqa yo'q";
  }
  if (error instanceof Error) return error.message;
  return "Noma'lum xatolik yuz berdi";
}

function createFormData(payload: Record<string, unknown>): FormData {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (value instanceof File) {
        formData.append(key, value);
      } else if (typeof value === "object") {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    }
  });
  return formData;
}

async function findAll() {
  try {
    const response = await api.get<ICategory[]>("/categories");
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

async function findOne(id: string) {
  try {
    const response = await api.get<ICategory>(`/categories/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

async function create(payload: CreateCategoryPayload) {
  try {
    const formData = createFormData(payload);
    const response = await api.post<ICategory>("/categories", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

async function update(id: string, payload: UpdateCategoryPayload) {
  try {
    const formData = createFormData(payload);
    const response = await api.patch<ICategory>(`/categories/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

async function remove(id: string) {
  try {
    const response = await api.delete<{ success: boolean }>(
      `/categories/${id}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export const categoryService = {
  findAll,
  findOne,
  create,
  update,
  remove,
};
