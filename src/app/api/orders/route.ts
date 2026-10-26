import { guard } from "@/lib/api-guard";
import { UserRole } from "@/types";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/database";
import { PurchaseOrder } from "@/models/Order";
import { OrderStatus, PaymentStatus } from "@/types";
import { getServerSession } from "@/middlewares/auth";
import { createSystemAuditLog } from "@/lib/audit-log";

function resolveIpFromRequest(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "System/Server"
  );
}

export async function GET(req: NextRequest) {
  try {
    const g = await guard(UserRole.ADMIN, UserRole.MANAGER);
    if (!g.ok) return g.response;
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 15;
    const search = searchParams.get("search") || "";
    const statusTab = searchParams.get("statusTab") || "ALL";

    const filter: Record<string, any> = {};

    if (statusTab !== "ALL") {
      filter.orderStatus = statusTab;
    }

    if (search) {
      filter.$or = [
        { notes: { $regex: search, $options: "i" } },
      ];
    }

    const [orders, total] = await Promise.all([
      PurchaseOrder.find(filter)
        .populate("vendorId", "name companyName email phone")
        .populate("products.productId", "name sku price")
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      PurchaseOrder.countDocuments(filter),
    ]);

    return NextResponse.json({
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const g = await guard(UserRole.ADMIN, UserRole.MANAGER);
    if (!g.ok) return g.response;
    await connectDB();
    const body = await req.json();

    if (!body.vendorId) {
      return NextResponse.json({ error: "Target vendor must be selected." }, { status: 400 });
    }

    if (!body.products || !Array.isArray(body.products) || body.products.length === 0) {
      return NextResponse.json({ error: "At least one product line item is required." }, { status: 400 });
    }

    const formattedProducts = body.products.map((p: any) => ({
      productId: p.productId,
      quantity: Math.max(1, Number(p.quantity) || 1),
      price: Math.max(0, Number(p.price) || 0),
    }));

    const totalAmount = formattedProducts.reduce(
      (sum: number, p: any) => sum + p.price * p.quantity, 
      0
    );

    const session = await getServerSession().catch(() => null);

    const order = await PurchaseOrder.create({
      vendorId: body.vendorId,
      products: formattedProducts,
      totalAmount,
      orderStatus: OrderStatus.DRAFT,
      paymentStatus: PaymentStatus.UNPAID,
      expectedDeliveryDate: body.expectedDeliveryDate ? new Date(body.expectedDeliveryDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: body.notes || "",
      createdBy: session?.user?.id || "System",
    });

    const populated = await PurchaseOrder.findById(order._id)
      .populate("vendorId", "name companyName")
      .populate("products.productId", "name sku")
      .lean();

    // Create Audit Log
    await createSystemAuditLog({
      action: "PO_CREATE",
      actor: session?.user?.name || "System Admin",
      actorId: session?.user?.id || "system",
      entityType: "PurchaseOrder",
      entityId: order._id.toString(),
      details: `Created Purchase Order for ${(populated as any)?.vendorId?.companyName || "Vendor"} with ${formattedProducts.length} items (Total: ₹${totalAmount.toLocaleString('en-IN')})`,
      ipAddress: resolveIpFromRequest(req),
    }).catch(() => {});

    return NextResponse.json(populated, { status: 201 });
  } catch (error: any) {
    console.error("Internal Order POST Breakdown Trace:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
