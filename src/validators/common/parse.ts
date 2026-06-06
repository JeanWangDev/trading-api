import { z } from "zod";
import { BadRequestError } from "@/errors/app-error";

export type ValidationIssue = {
  field: string;
  message: string;
};

/** Map Zod issues to `{ fieldName: message }` for the client. */
export function zodToFieldIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? String(issue.path[0]) : "_form",
    message: issue.message,
  }));
}

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("；");
}

/**
 * Validate request body/query with a Zod schema (demo-server style entry point).
 * Throws `BadRequestError` with HTTP 200 + body.code 400 and `details` issues.
 */
export function validateBody<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);

  if (!result.success) {
    const issues = zodToFieldIssues(result.error);
    throw new BadRequestError(formatZodError(result.error), issues);
  }

  return result.data;
}

export function validateQuery<T>(schema: z.ZodType<T>, input: unknown): T {
  return validateBody(schema, input);
}
