import { NextRequest, NextResponse } from "next/server";
import { VendorService } from "@/services/vendor/vendor.service";
import { requireRole } from "@/middlewares/role";
import { validateBody } from "@/middlewares/validate";
import { handleApiError } from "@/middlewares/error";
import { createVendorSchema, updateVendorSchema, verifyVendorSchema } from "@/validators/vendor";
import { UserRole } from "@/types";

export class VendorController {
  static async list(req: NextRequest) {
    try {
      const { searchParams } = new URL(req.url);
      const data = await VendorService.getAll({
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
      const vendor = await VendorService.getById(id);
      if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(vendor);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async create(req: NextRequest) {
    try {
      const session = await requireRole(UserRole.ADMIN, UserRole.MANAGER)();
      if (session instanceof NextResponse) return session;

      const body = await validateBody(createVendorSchema)(req);
      if (body instanceof NextResponse) return body;

      const ip = req.headers.get("x-forwarded-for") || "unknown";
      const vendor = await VendorService.create(body, session.user.id, ip);
      return NextResponse.json(vendor, { status: 201 });
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async update(req: NextRequest, id: string) {
    try {
      const session = await requireRole(UserRole.ADMIN, UserRole.MANAGER)();
      if (session instanceof NextResponse) return session;

      const body = await validateBody(updateVendorSchema)(req);
      if (body instanceof NextResponse) return body;

      const ip = req.headers.get("x-forwarded-for") || "unknown";
      const vendor = await VendorService.update(id, body, session.user.id, ip);
      if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(vendor);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async verify(req: NextRequest, id: string) {
    try {
      const session = await requireRole(UserRole.ADMIN)();
      if (session instanceof NextResponse) return session;

      const body = await validateBody(verifyVendorSchema)(req);
      if (body instanceof NextResponse) return body;

      const ip = req.headers.get("x-forwarded-for") || "unknown";
      const vendor = await VendorService.updateVerification(
        id,
        body.verificationStatus,
        body.notes,
        session.user.id,
        ip
      );
      return NextResponse.json(vendor);
    } catch (error) {
      return handleApiError(error);
    }
  }
}
