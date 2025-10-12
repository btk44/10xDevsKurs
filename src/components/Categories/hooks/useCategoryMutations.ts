import { useState } from "react";
import type {
  CategoryDTO,
  CreateCategoryCommand,
  UpdateCategoryCommand,
  ApiResponse,
  ApiErrorResponse,
} from "../../../types";

interface MutationState {
  isLoading: boolean;
  error: string | null;
  fieldErrors: Record<string, string>;
}

interface CategoryMutations {
  create: (command: CreateCategoryCommand) => Promise<CategoryDTO | null>;
  update: (id: number, command: UpdateCategoryCommand) => Promise<CategoryDTO | null>;
  remove: (id: number) => Promise<boolean>;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: string | null;
  fieldErrors: Record<string, string>;
  deleteError: string | null;
}

export const useCategoryMutations = (): CategoryMutations => {
  const [createState, setCreateState] = useState<MutationState>({
    isLoading: false,
    error: null,
    fieldErrors: {},
  });

  const [updateState, setUpdateState] = useState<MutationState>({
    isLoading: false,
    error: null,
    fieldErrors: {},
  });

  const [deleteState, setDeleteState] = useState<MutationState>({
    isLoading: false,
    error: null,
    fieldErrors: {},
  });

  const handleApiError = async (response: Response): Promise<ApiErrorResponse> => {
    try {
      return (await response.json()) as ApiErrorResponse;
    } catch (error) {
      return {
        error: {
          code: "UNKNOWN_ERROR",
          message: "An unknown error occurred",
        },
      };
    }
  };

  const mapValidationErrors = (errorResponse: ApiErrorResponse): Record<string, string> => {
    const fieldErrors: Record<string, string> = {};

    if (errorResponse.error?.details && Array.isArray(errorResponse.error.details)) {
      errorResponse.error.details.forEach((detail: any) => {
        if (detail.field && detail.message) {
          fieldErrors[detail.field] = detail.message;
        }
      });
    }

    return fieldErrors;
  };

  const create = async (command: CreateCategoryCommand): Promise<CategoryDTO | null> => {
    setCreateState({
      isLoading: true,
      error: null,
      fieldErrors: {},
    });

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorResponse = await handleApiError(response);
        const fieldErrors = mapValidationErrors(errorResponse);

        setCreateState({
          isLoading: false,
          error: errorResponse.error.message,
          fieldErrors,
        });

        return null;
      }

      const data = (await response.json()) as ApiResponse<CategoryDTO>;
      setCreateState({
        isLoading: false,
        error: null,
        fieldErrors: {},
      });

      return data.data;
    } catch (error) {
      setCreateState({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to create category",
        fieldErrors: {},
      });

      return null;
    }
  };

  const update = async (id: number, command: UpdateCategoryCommand): Promise<CategoryDTO | null> => {
    setUpdateState({
      isLoading: true,
      error: null,
      fieldErrors: {},
    });

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorResponse = await handleApiError(response);
        const fieldErrors = mapValidationErrors(errorResponse);

        setUpdateState({
          isLoading: false,
          error: errorResponse.error.message,
          fieldErrors,
        });

        return null;
      }

      const data = (await response.json()) as ApiResponse<CategoryDTO>;
      setUpdateState({
        isLoading: false,
        error: null,
        fieldErrors: {},
      });

      return data.data;
    } catch (error) {
      setUpdateState({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to update category",
        fieldErrors: {},
      });

      return null;
    }
  };

  const remove = async (id: number): Promise<boolean> => {
    setDeleteState({
      isLoading: true,
      error: null,
      fieldErrors: {},
    });

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorResponse = await handleApiError(response);

        // Special handling for CATEGORY_IN_USE error
        const errorMessage =
          errorResponse.error.code === "CATEGORY_IN_USE"
            ? "This category is in use and cannot be deleted"
            : errorResponse.error.message;

        setDeleteState({
          isLoading: false,
          error: errorMessage,
          fieldErrors: {},
        });

        return false;
      }

      setDeleteState({
        isLoading: false,
        error: null,
        fieldErrors: {},
      });

      return true;
    } catch (error) {
      setDeleteState({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to delete category",
        fieldErrors: {},
      });

      return false;
    }
  };

  return {
    create,
    update,
    remove,
    isCreating: createState.isLoading,
    isUpdating: updateState.isLoading,
    isDeleting: deleteState.isLoading,
    error: createState.error || updateState.error,
    fieldErrors: createState.isLoading ? createState.fieldErrors : updateState.fieldErrors,
    deleteError: deleteState.error,
  };
};
