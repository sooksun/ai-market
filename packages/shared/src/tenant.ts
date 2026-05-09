import { z } from 'zod';

export const SwitchTenantInputSchema = z.object({
  schoolId: z.string().min(1),
});
export type SwitchTenantInput = z.infer<typeof SwitchTenantInputSchema>;

export const TenantSchoolSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string().nullable(),
  area: z
    .object({
      id: z.string(),
      code: z.string().nullable(),
      name: z.string(),
    })
    .nullable(),
  isCurrent: z.boolean(),
  isHome: z.boolean(),
});
export type TenantSchool = z.infer<typeof TenantSchoolSchema>;

export const TenantsResponseSchema = z.object({
  current: z.object({
    schoolId: z.string(),
    schoolName: z.string(),
    areaName: z.string().nullable(),
  }),
  home: z.object({ schoolId: z.string(), schoolName: z.string() }),
  canSwitch: z.boolean(),
  schools: z.array(TenantSchoolSchema),
});
export type TenantsResponse = z.infer<typeof TenantsResponseSchema>;
