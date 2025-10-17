import { z } from "zod";

export const signInSchema = z.object({
    acceptMessages: z.boolean(),
})