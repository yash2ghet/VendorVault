import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/database";
import { Product } from "@/models/Product";
import { createSystemAuditLog } from "@/lib/audit-log";
import { guard } from "@/lib/api-guard";
import { UserRole } from "@/types";

export const dynamic = "force-dynamic";

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
    const limit = Number(searchParams.get("limit")) || 20;
    const search = searchParams.get("search") || "";
    const statusTab = searchParams.get("statusTab") || "ALL";

    const filter: Record<string, any> = {};

    // 🔑 Search matching logic across text keys
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    // 🔑 Advanced Status & Inventory Evaluation Tabs
    if (statusTab === "ACTIVE") filter.status = "ACTIVE";
    if (statusTab === "DRAFT") filter.status = "DRAFT";
    if (statusTab === "LOW_STOCK") {
      filter.$expr = { $lte: ["$quantity", "$lowStockThreshold"] };
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("brandId", "name")
        .populate("categoryId", "name")
        .populate("vendorId", "name companyName")
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Product.countDocuments(filter),
    ]);

    return NextResponse.json({ 
      products, 
      total, 
      page, 
      totalPages: Math.ceil(total / limit) 
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

    const product = await Product.create({
      name: body.name,
      sku: body.sku,
      price: Number(body.price) || 0,
      quantity: Number(body.quantity) || 0,
      lowStockThreshold: Number(body.lowStockThreshold) || 10,
      brandId: body.brandId || null,
      categoryId: body.categoryId || null,
      vendorId: body.vendorId || null,
      description: body.description || "",
      status: body.status || "ACTIVE",
    });

    await createSystemAuditLog({
      action: "PRODUCT_CREATE",
      actor: g.userName,
      actorId: g.userId,
      entityType: "Product",
      entityId: product._id.toString(),
      details: `Created new catalog product: ${product.name} (SKU: ${product.sku}, Stock: ${product.quantity}, Price: ₹${product.price})`,
      ipAddress: resolveIpFromRequest(req),
    }).catch(() => {});

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}