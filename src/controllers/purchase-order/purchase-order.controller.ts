import { NextRequest, NextResponse } from "next/server";
import { PurchaseOrderService } from "@/services/purchase-order/purchase-order.service";
import { requireRole } from "@/middlewares/role";
import { validateBody } from "@/middlewares/validate";
import { handleApiError } from "@/middlewares/error";
import { createPurchaseOrderSchema, updateOrderStatusSchema, updatePaymentStatusSchema } from "@/validators/purchase-order";
import { UserRole } from "@/types";
import { requireAuth } from "@/middlewares/auth";

export class PurchaseOrderController {
  static async list(req: NextRequest) {
    try {
      const session = await requireAuth();
      if (session instanceof NextResponse) return session;

      const { searchParams } = new URL(req.url);
      const data = await PurchaseOrderService.getAll({
        page: Number(searchParams.get("page")) || 1,
        limit: Number(searchParams.get("limit")) || 20,
        orderStatus: searchParams.get("orderStatus") || undefined,
        paymentStatus: searchParams.get("paymentStatus") || undefined,
        vendorId: searchParams.get("vendorId") || undefined,
      });
      return NextResponse.json(data);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async getById(req: NextRequest, id: string) {
    try {
      const order = await PurchaseOrderService.getById(id);
      if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(order);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async create(req: NextRequest) {
    try {
      const session = await requireRole(UserRole.ADMIN, UserRole.MANAGER)();
      if (session instanceof NextResponse) return session;

      const body = await validateBody(createPurchaseOrderSchema)(req);
      if (body instanceof NextResponse) return body;

      const ip = req.headers.get("x-forwarded-for") || "unknown";
      const order = await PurchaseOrderService.create(body, session.user.id, ip);
      return NextResponse.json(order, { status: 201 });
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async updateStatus(req: NextRequest, id: string) {
    try {
      const session = await requireRole(UserRole.ADMIN, UserRole.MANAGER)();
      if (session instanceof NextResponse) return session;

      const body = await validateBody(updateOrderStatusSchema)(req);
      if (body instanceof NextResponse) return body;

      const ip = req.headers.get("x-forwarded-for") || "unknown";
      const order = await PurchaseOrderService.updateStatus(id, body.orderStatus, session.user.id, ip);
      if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(order);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async updatePayment(req: NextRequest, id: string) {
    try {
      const session = await requireRole(UserRole.ADMIN)();
      if (session instanceof NextResponse) return session;

      const body = await validateBody(updatePaymentStatusSchema)(req);
      if (body instanceof NextResponse) return body;

      const order = await PurchaseOrderService.updatePaymentStatus(id, body.paymentStatus);
      if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(order);
    } catch (error) {
      return handleApiError(error);
    }
  }
}
