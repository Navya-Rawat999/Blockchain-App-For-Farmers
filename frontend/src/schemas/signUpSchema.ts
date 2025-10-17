import { z } from "zod";

export const usernameValidation = z
  .string()
  .min(2, "User name must be atleast 2 characters")
  .max(20,"Username must be below 20 characters")
  .regex(/^[a-zA-Z0-9_]+$/,"User name must not contain special characters")


export const signUpSchema = z.object({
    username: usernameValidation,
    email: z.string().email({message:'Invalid email address'}),
    password: z.string().min(8,{message:'password must be atleast 6 characters'})
})