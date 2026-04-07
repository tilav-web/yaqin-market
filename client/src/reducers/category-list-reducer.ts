import type { ICategory } from "@/interfaces/category.interface";
import type { TName } from "@/lib/i18n";

export type CategoryFormState = {
  name: TName;
  slug: string;
  image: string | File;
  order_number: string;
  is_active: boolean;
};

export type CategoryListState = {
  selectedId: string | null;
  dialogOpen: boolean;
  dialogMode: "create" | "edit" | null;
  editingId: string | null;
  form: CategoryFormState;
};

export type CategoryListAction =
  | { type: "SELECT"; payload: { id: string | null } }
  | { type: "OPEN_CREATE" }
  | { type: "OPEN_EDIT"; payload: { category: ICategory } }
  | { type: "CLOSE_DIALOG" }
  | { type: "SET_FIELD"; payload: { key: keyof CategoryFormState; value: string | boolean | File | TName } }
  | { type: "SET_NAME_FIELD"; payload: { lang: keyof TName; value: string } }
  | { type: "RESET_FORM" };

export const emptyCategoryForm: CategoryFormState = {
  name: { uz: "", ru: "" },
  slug: "",
  image: "",
  order_number: "0",
  is_active: true,
};

export const initialCategoryListState: CategoryListState = {
  selectedId: null,
  dialogOpen: false,
  dialogMode: null,
  editingId: null,
  form: { ...emptyCategoryForm },
};

export const categoryListActions = {
  select: (id: string | null): CategoryListAction => ({
    type: "SELECT",
    payload: { id },
  }),
  openCreate: (): CategoryListAction => ({ type: "OPEN_CREATE" }),
  openEdit: (category: ICategory): CategoryListAction => ({
    type: "OPEN_EDIT",
    payload: { category },
  }),
  closeDialog: (): CategoryListAction => ({ type: "CLOSE_DIALOG" }),
  setField: (
    key: keyof CategoryFormState,
    value: string | boolean | File,
  ): CategoryListAction => ({
    type: "SET_FIELD",
    payload: { key, value },
  }),
  resetForm: (): CategoryListAction => ({ type: "RESET_FORM" }),
  setNameField: (lang: keyof TName, value: string): CategoryListAction => ({
    type: "SET_NAME_FIELD",
    payload: { lang, value },
  }),
};

export function categoryListReducer(
  state: CategoryListState,
  action: CategoryListAction,
): CategoryListState {
  switch (action.type) {
    case "SELECT":
      return { ...state, selectedId: action.payload.id };
    case "OPEN_CREATE":
      return {
        ...state,
        dialogOpen: true,
        dialogMode: "create",
        editingId: null,
        form: { ...emptyCategoryForm },
      };
    case "OPEN_EDIT": {
      const { category } = action.payload;
      return {
        ...state,
        dialogOpen: true,
        dialogMode: "edit",
        editingId: category.id,
        form: {
          name: typeof category.name === 'object' ? category.name : { uz: String(category.name ?? ""), ru: "" },
          slug: category.slug ?? "",
          image: category.image ?? "",
          order_number: String(category.order_number ?? 0),
          is_active: category.is_active ?? true,
        },
      };
    }
    case "CLOSE_DIALOG":
      return {
        ...state,
        dialogOpen: false,
        dialogMode: null,
        editingId: null,
        form: { ...state.form },
      };
    case "SET_FIELD":
      return {
        ...state,
        form: {
          ...state.form,
          [action.payload.key]: action.payload.value,
        },
      };
    case "SET_NAME_FIELD":
      return {
        ...state,
        form: {
          ...state.form,
          name: { ...state.form.name, [action.payload.lang]: action.payload.value },
        },
      };
    case "RESET_FORM":
      return { ...state, form: { ...emptyCategoryForm } };
    default:
      return state;
  }
}
