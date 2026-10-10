import api from "@/lib/api";
import type { ApiResponse } from "@/types";
import type { UploadedFile, UploadedImage } from "@/types/upload.types";

type UploadProgressHandler = (progress: number) => void;

/** Picks the Cloudinary folder (dealker/<kind>); see backend upload-folders.js. */
export type UploadKind =
  | "product"
  | "banner"
  | "category"
  | "brand"
  | "shop"
  | "avatar"
  | "icon"
  | "theme"
  | "store"
  | "notification"
  | "listing"
  | "misc";

/** Upload a single image to Cloudinary via backend */
export async function uploadImage(
  file: File,
  onProgress?: UploadProgressHandler,
  kind?: UploadKind,
): Promise<UploadedImage> {
  const formData = new FormData();
  formData.append("image", file);

  const { data } = await api.post<ApiResponse<UploadedImage>>(
    "/uploads/image",
    formData,
    {
      params: kind ? { kind } : undefined,
      onUploadProgress: (event) => {
        if (!onProgress) return;
        const total = event.total ?? file.size;
        const progress = total ? Math.round((event.loaded / total) * 100) : 0;
        onProgress(progress);
      },
    },
  );
  return data.data;
}

export async function uploadFile(
  file: File,
  onProgress?: UploadProgressHandler,
  kind?: UploadKind,
): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post<ApiResponse<UploadedFile>>(
    "/uploads/file",
    formData,
    {
      params: kind ? { kind } : undefined,
      onUploadProgress: (event) => {
        if (!onProgress) return;
        const total = event.total ?? file.size;
        const progress = total ? Math.round((event.loaded / total) * 100) : 0;
        onProgress(progress);
      },
    },
  );
  return data.data;
}

/** Upload multiple images */
export async function uploadMultipleImages(
  files: File[],
  kind?: UploadKind,
): Promise<UploadedImage[]> {
  const formData = new FormData();
  files.forEach((f) => formData.append("images", f));

  const { data } = await api.post<ApiResponse<UploadedImage[]>>(
    "/uploads/images",
    formData,
    { params: kind ? { kind } : undefined },
  );
  return data.data;
}

/** Delete an uploaded image by publicId */
export async function deleteImage(publicId: string) {
  const { data } = await api.delete<ApiResponse<null>>("/uploads/image", {
    data: { publicId },
  });
  return data.data;
}

/** Bulk import products from CSV */
export async function bulkImportProducts(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post<
    ApiResponse<{ imported: number; skipped: number; errors: string[] }>
  >("/products/bulk-import", formData);
  return data.data;
}

/** Create manual order (admin places order for a customer) */
export async function createManualOrder(payload: {
  userId: string;
  items: { productId: string; quantity: number }[];
  paymentMethod?: "COD" | "MANUAL";
  deliveryAddress?: Record<string, unknown>;
  couponCode?: string;
}) {
  const { data } = await api.post<
    ApiResponse<{ id: string; order_number: string; total_amount: number }>
  >("/admin/orders/manual", payload);
  return data.data;
}
