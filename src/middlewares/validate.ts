import { NextRequest, NextResponse } from "next/server";
import { ZodSchema } from "zod";

export function validateBody<T>(schema: ZodSchema<T>) {
  return async (req: NextRequest): Promise<T | NextResponse> => {
    const body = await req.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    return result.data;
  };
}
