import { NextRequest, NextResponse } from "next/server";
import { BrandService } from "@/services/brand/brand.service";
import { requireRole } from "@/middlewares/role";
import { validateBody } from "@/middlewares/validate";
import { handleApiError } from "@/middlewares/error";
import { createBrandSchema, updateBrandSchema } from "@/validators/brand";
import { UserRole } from "@/types";
import { requireAuth } from "@/middlewares/auth";

export class BrandController {
  static async list(req: NextRequest) {
    try {
      const session = await requireAuth();
      if (session instanceof NextResponse) return session;

      const { searchParams } = new URL(req.url);
      const data = await BrandService.getAll({
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
      const brand = await BrandService.getById(id);
      if (!brand) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(brand);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async create(req: NextRequest) {
    try {
      const session = await requireRole(UserRole.ADMIN, UserRole.MANAGER)();
      if (session instanceof NextResponse) return session;

      const body = await validateBody(createBrandSchema)(req);
      if (body instanceof NextResponse) return body;

      const ip = req.headers.get("x-forwarded-for") || "unknown";
      const brand = await BrandService.create(body, session.user.id, ip);
      return NextResponse.json(brand, { status: 201 });
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async update(req: NextRequest, id: string) {
    try {
      const session = await requireRole(UserRole.ADMIN, UserRole.MANAGER)();
      if (session instanceof NextResponse) return session;

      const body = await validateBody(updateBrandSchema)(req);
      if (body instanceof NextResponse) return body;

      const ip = req.headers.get("x-forwarded-for") || "unknown";
      const brand = await BrandService.update(id, body, session.user.id, ip);
      if (!brand) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(brand);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async delete(req: NextRequest, id: string) {
    try {
      const session = await requireRole(UserRole.ADMIN)();
      if (session instanceof NextResponse) return session;
      await BrandService.delete(id);
      return NextResponse.json({ message: "Deleted" });
    } catch (error) {
      return handleApiError(error);
    }
  }
}
