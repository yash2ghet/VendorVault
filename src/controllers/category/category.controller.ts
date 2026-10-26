import { NextRequest, NextResponse } from "next/server";
import { CategoryService } from "@/services/category/category.service";
import { requireRole } from "@/middlewares/role";
import { validateBody } from "@/middlewares/validate";
import { handleApiError } from "@/middlewares/error";
import { createCategorySchema, updateCategorySchema } from "@/validators/category";
import { UserRole } from "@/types";
import { requireAuth } from "@/middlewares/auth";

export class CategoryController {
  static async list(req: NextRequest) {
    try {
      const session = await requireAuth();
      if (session instanceof NextResponse) return session;

      const { searchParams } = new URL(req.url);
      const data = await CategoryService.getAll({
        page: Number(searchParams.get("page")) || 1,
        limit: Number(searchParams.get("limit")) || 20,
        status: searchParams.get("status") || undefined,
      });
      return NextResponse.json(data);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async getById(req: NextRequest, id: string) {
    try {
      const category = await CategoryService.getById(id);
      if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(category);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async create(req: NextRequest) {
    try {
      const session = await requireRole(UserRole.ADMIN, UserRole.MANAGER)();
      if (session instanceof NextResponse) return session;

      const body = await validateBody(createCategorySchema)(req);
      if (body instanceof NextResponse) return body;

      const ip = req.headers.get("x-forwarded-for") || "unknown";
      const category = await CategoryService.create(body, session.user.id, ip);
      return NextResponse.json(category, { status: 201 });
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async update(req: NextRequest, id: string) {
    try {
      const session = await requireRole(UserRole.ADMIN, UserRole.MANAGER)();
      if (session instanceof NextResponse) return session;

      const body = await validateBody(updateCategorySchema)(req);
      if (body instanceof NextResponse) return body;

      const ip = req.headers.get("x-forwarded-for") || "unknown";
      const category = await CategoryService.update(id, body, session.user.id, ip);
      if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(category);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async delete(req: NextRequest, id: string) {
    try {
      const session = await requireRole(UserRole.ADMIN)();
      if (session instanceof NextResponse) return session;
      await CategoryService.delete(id);
      return NextResponse.json({ message: "Deleted" });
    } catch (error) {
      return handleApiError(error);
    }
  }
}
