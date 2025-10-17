import { z } from "zod";

export const signInSchema = z.object({
    content: z.string(),
})