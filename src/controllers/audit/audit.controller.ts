import { NextRequest, NextResponse } from "next/server";
import { AuditService } from "@/services/audit/audit.service";
import { requireRole } from "@/middlewares/role";
import { handleApiError } from "@/middlewares/error";
import { UserRole } from "@/types";

export class AuditController {
  static async list(req: NextRequest) {
    try {
      const session = await requireRole(UserRole.ADMIN)();
      if (session instanceof NextResponse) return session;

      const { searchParams } = new URL(req.url);
      const data = await AuditService.getLogs({
        page: Number(searchParams.get("page")) || 1,
        limit: Number(searchParams.get("limit")) || 50,
        userId: searchParams.get("userId") || undefined,
        action: searchParams.get("action") || undefined,
        entityType: searchParams.get("entityType") || undefined,
        startDate: searchParams.get("startDate") || undefined,
        endDate: searchParams.get("endDate") || undefined,
      });
      return NextResponse.json(data);
    } catch (error) {
      return handleApiError(error);
    }
  }
}
