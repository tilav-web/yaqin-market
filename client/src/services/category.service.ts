import axios from "axios";
import { api } from "@/api/api";
import type { ICategory } from "@/interfaces/category.interface";

export type CreateCategoryPayload = {
  name: string;
  slug?: string;
  image?: string | File;
  order_number?: number;
  is_active?: boolean;
};

export type UpdateCategoryPayload = {
  name?: string;
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

function createFormData(payload: Record<string, any>): FormData {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (key === "image" && typeof value === "string") {
        // If image is a string (URL), we don't necessarily need to send it back as a file
        // But if the server expects a file, we might just skip it or send it as is.
        // For now, let's only append if it's a File or if we want to update the URL (though server handles files)
        formData.append(key, value);
      } else {
        formData.append(key, value instanceof File ? value : String(value));
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
