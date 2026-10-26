import { NextRequest, NextResponse } from "next/server";
import { UserService } from "@/services/user/user.service";
import { requireRole } from "@/middlewares/role";
import { validateBody } from "@/middlewares/validate";
import { handleApiError } from "@/middlewares/error";
import { updateUserRoleSchema } from "@/validators/user";
import { UserRole } from "@/types";
import { requireAuth } from "@/middlewares/auth";

export class UserController {
  static async list(req: NextRequest) {
    try {
      const session = await requireRole(UserRole.ADMIN)();
      if (session instanceof NextResponse) return session;

      const { searchParams } = new URL(req.url);
      const data = await UserService.getAll({
        page: Number(searchParams.get("page")) || 1,
        limit: Number(searchParams.get("limit")) || 20,
        role: searchParams.get("role") || undefined,
      });
      return NextResponse.json(data);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async updateRole(req: NextRequest, id: string) {
    try {
      const session = await requireRole(UserRole.ADMIN)();
      if (session instanceof NextResponse) return session;

      const body = await validateBody(updateUserRoleSchema)(req);
      if (body instanceof NextResponse) return body;

      const ip = req.headers.get("x-forwarded-for") || "unknown";
      const user = await UserService.updateRole(id, body.role, session.user.id, ip);
      if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(user);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async delete(req: NextRequest, id: string) {
    try {
      const session = await requireRole(UserRole.ADMIN)();
      if (session instanceof NextResponse) return session;

      const ip = req.headers.get("x-forwarded-for") || "unknown";
      await UserService.delete(id, session.user.id, ip);
      return NextResponse.json({ message: "Deleted" });
    } catch (error) {
      return handleApiError(error);
    }
  }
}
