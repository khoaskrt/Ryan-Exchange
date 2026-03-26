import { z } from "zod";

export { AUTH_ALLOWED_COUNTRY, loginRequestSchema as loginSchema, signupRequestSchema as signupSchema } from "@/lib/server/auth/auth.validation";
export type { LoginRequest as LoginInput, SignupRequest as SignupInput } from "@/lib/server/auth/auth.validation";

export const inviteRedeemSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").max(160),
  code: z.string().trim().min(4, "Invite code is required").max(64),
});

export const createOrderSchema = z
  .object({
    symbol: z.string().trim().min(4).max(30),
    side: z.enum(["BUY", "SELL"]),
    orderType: z.enum(["MARKET", "LIMIT"]),
    quantity: z.number().positive("Quantity must be greater than zero"),
    price: z.number().positive("Price must be greater than zero").optional(),
  })
  .superRefine((data, ctx) => {
    if (data.orderType === "LIMIT" && data.price == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Price is required for limit orders.",
        path: ["price"],
      });
    }
  });

export type InviteRedeemInput = z.infer<typeof inviteRedeemSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
