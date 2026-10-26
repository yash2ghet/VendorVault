import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/database";
import { User } from "@/models/User";
import { guard, escapeRegex, apiError } from "@/lib/api-guard";
import { UserRole } from "@/types";

export const dynamic = "force-dynamic";

// Lists every account (emails, roles) — administrators only.
export async function GET(req: NextRequest) {
  const g = await guard(UserRole.ADMIN);
  if (!g.ok) return g.response;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 15, 1), 100);
    const search = (searchParams.get("search") || "").trim();
    const role = (searchParams.get("role") || "").toUpperCase();

    const filter: Record<string, unknown> = {};
    if (role && role !== "ALL" && Object.values(UserRole).includes(role as UserRole)) filter.role = role;
    if (search) {
      const rx = { $regex: escapeRegex(search), $options: "i" };
      filter.$or = [{ name: rx }, { email: rx }];
    }

    const [users, total] = await Promise.all([
      User.find(filter).select("-__v").skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }).lean(),
      User.countDocuments(filter),
    ]);

    return NextResponse.json({ users, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return apiError(error);
  }
}
