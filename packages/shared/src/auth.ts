import { z } from 'zod';
import { RoleSchema } from './role';

export const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;

export const CurrentUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  schoolId: z.string(),
  homeSchoolId: z.string(),
  roles: z.array(RoleSchema),
});

export type CurrentUser = z.infer<typeof CurrentUserSchema>;
