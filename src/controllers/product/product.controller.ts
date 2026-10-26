import { NextRequest, NextResponse } from "next/server";
import { ProductService } from "@/services/product/product.service";
import { requireRole } from "@/middlewares/role";
import { validateBody } from "@/middlewares/validate";
import { handleApiError } from "@/middlewares/error";
import { createProductSchema, updateProductSchema } from "@/validators/product";
import { UserRole } from "@/types";
import { requireAuth } from "@/middlewares/auth";

export class ProductController {
  static async list(req: NextRequest) {
    try {
      const session = await requireAuth();
      if (session instanceof NextResponse) return session;

      const { searchParams } = new URL(req.url);
      const data = await ProductService.getAll({
        page: Number(searchParams.get("page")) || 1,
        limit: Number(searchParams.get("limit")) || 20,
        status: searchParams.get("status") || undefined,
        brandId: searchParams.get("brandId") || undefined,
        categoryId: searchParams.get("categoryId") || undefined,
        vendorId: searchParams.get("vendorId") || undefined,
        search: searchParams.get("search") || undefined,
      });
      return NextResponse.json(data);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async getById(req: NextRequest, id: string) {
    try {
      const product = await ProductService.getById(id);
      if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(product);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async create(req: NextRequest) {
    try {
      const session = await requireRole(UserRole.ADMIN, UserRole.MANAGER)();
      if (session instanceof NextResponse) return session;

      const body = await validateBody(createProductSchema)(req);
      if (body instanceof NextResponse) return body;

      const ip = req.headers.get("x-forwarded-for") || "unknown";
      const product = await ProductService.create(body, session.user.id, ip);
      return NextResponse.json(product, { status: 201 });
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async update(req: NextRequest, id: string) {
    try {
      const session = await requireRole(UserRole.ADMIN, UserRole.MANAGER)();
      if (session instanceof NextResponse) return session;

      const body = await validateBody(updateProductSchema)(req);
      if (body instanceof NextResponse) return body;

      const ip = req.headers.get("x-forwarded-for") || "unknown";
      const product = await ProductService.update(id, body, session.user.id, ip);
      if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(product);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async delete(req: NextRequest, id: string) {
    try {
      const session = await requireRole(UserRole.ADMIN)();
      if (session instanceof NextResponse) return session;
      await ProductService.delete(id);
      return NextResponse.json({ message: "Deleted" });
    } catch (error) {
      return handleApiError(error);
    }
  }
}
