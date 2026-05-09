import { z } from 'zod';

export const StockMovementTypeSchema = z.enum(['IN', 'OUT', 'ADJUST', 'WRITE_OFF']);
export type StockMovementType = z.infer<typeof StockMovementTypeSchema>;

export const STOCK_MOVEMENT_LABELS_TH: Record<StockMovementType, string> = {
  IN: 'รับเข้า',
  OUT: 'เบิกออก',
  ADJUST: 'ปรับปรุง',
  WRITE_OFF: 'ตัดจำหน่าย',
};

export const AssetStatusSchema = z.enum(['ACTIVE', 'STORED', 'REPAIR', 'DISPOSED']);
export type AssetStatus = z.infer<typeof AssetStatusSchema>;

export const ASSET_STATUS_LABELS_TH: Record<AssetStatus, string> = {
  ACTIVE: 'ใช้งาน',
  STORED: 'อยู่ในคลัง',
  REPAIR: 'ซ่อมบำรุง',
  DISPOSED: 'ตัดจำหน่าย',
};

export const StockOutInputSchema = z.object({
  quantity: z.coerce.number().positive(),
  notes: z.string().max(500).nullable().optional(),
});
export type StockOutInput = z.infer<typeof StockOutInputSchema>;

export const UpdateAssetSchema = z.object({
  location: z.string().max(255).nullable().optional(),
  custodianId: z.string().max(64).nullable().optional(),
  status: AssetStatusSchema.optional(),
  notes: z.string().max(2000).nullable().optional(),
});
export type UpdateAssetInput = z.infer<typeof UpdateAssetSchema>;
