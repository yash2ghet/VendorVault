import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/config/database";
import { guard, apiError, resolveSupplierVendorId } from "@/lib/api-guard";
import { UserRole } from "@/types";
import { PurchaseOrder } from "@/models/Order";
import { Product } from "@/models/Product";
import { Vendor } from "@/models/Vendor";
import HardwareRequest from "@/models/HardwareRequest";

export const dynamic = "force-dynamic";

const startOfMonth = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); };
const lowStockExpr = { $expr: { $lte: ["$quantity", "$lowStockThreshold"] }, status: "ACTIVE" };

/**
 * One endpoint, four shapes. The role comes from the SERVER session —
 * a browser can never ask for another role's data.
 */
export async function GET() {
  try {
    const g = await guard();
    if (!g.ok) return g.response;
    await connectDB();

    /* ------------------------------ MANAGER ------------------------------ */
    if (g.role === UserRole.MANAGER) {
      const monthStart = startOfMonth();
      const sixMonthsAgo = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1);

      const [
        pendingRequests, approvedRequests, rejectedRequests, recentPending,
        poPendingApproval, poInTransit, poPendingList, lowStock, spendMonth, spendByMonth,
      ] = await Promise.all([
        HardwareRequest.countDocuments({ status: "PENDING" }),
        HardwareRequest.countDocuments({ status: { $in: ["APPROVED_BY_MANAGER", "PROCURED_BY_ADMIN"] } }),
        HardwareRequest.countDocuments({ status: "REJECTED" }),
        HardwareRequest.find({ status: "PENDING" }).sort({ createdAt: -1 }).limit(5).lean(),
        PurchaseOrder.countDocuments({ orderStatus: "PENDING" }),
        PurchaseOrder.countDocuments({ orderStatus: { $in: ["CONFIRMED", "SHIPPED"] } }),
        PurchaseOrder.find({ orderStatus: "PENDING" }).sort({ createdAt: -1 }).limit(5)
          .populate("vendorId", "name companyName").lean(),
        Product.countDocuments(lowStockExpr),
        PurchaseOrder.aggregate([
          { $match: { createdAt: { $gte: monthStart }, orderStatus: { $ne: "CANCELLED" } } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),
        PurchaseOrder.aggregate([
          { $match: { createdAt: { $gte: sixMonthsAgo }, orderStatus: { $ne: "CANCELLED" } } },
          { $group: { _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } }, total: { $sum: "$totalAmount" }, orders: { $sum: 1 } } },
          { $sort: { "_id.y": 1, "_id.m": 1 } },
        ]),
      ]);

      return NextResponse.json({
        role: "MANAGER",
        cards: {
          pendingRequests, approvedRequests, rejectedRequests,
          poPendingApproval, poInTransit, lowStock,
          spendThisMonth: spendMonth[0]?.total || 0,
        },
        recentPending: recentPending.map((r: any) => ({
          id: String(r._id), userName: r.userName, assetType: r.assetType,
          urgency: r.urgency, createdAt: r.createdAt,
        })),
        poPendingList: poPendingList.map((o: any) => ({
          id: String(o._id), poNumber: o.poNumber, vendor: o.vendorId?.companyName || o.vendorId?.name || "—",
          totalAmount: o.totalAmount, createdAt: o.createdAt,
        })),
        spendByMonth: spendByMonth.map((x: any) => ({ y: x._id.y, m: x._id.m, total: x.total, orders: x.orders })),
      });
    }

    /* ------------------------------ EMPLOYEE ------------------------------ */
    if (g.role === UserRole.STAFF) {
      const mine = { userId: g.userId };
      const [total, pending, approved, procured, rejected, recent] = await Promise.all([
        HardwareRequest.countDocuments(mine),
        HardwareRequest.countDocuments({ ...mine, status: "PENDING" }),
        HardwareRequest.countDocuments({ ...mine, status: "APPROVED_BY_MANAGER" }),
        HardwareRequest.countDocuments({ ...mine, status: "PROCURED_BY_ADMIN" }),
        HardwareRequest.countDocuments({ ...mine, status: "REJECTED" }),
        HardwareRequest.find(mine).sort({ createdAt: -1 }).limit(6).lean(),
      ]);

      return NextResponse.json({
        role: "STAFF",
        cards: { total, pending, approved, procured, rejected },
        recent: recent.map((r: any) => ({
          id: String(r._id), assetType: r.assetType, modelPreference: r.modelPreference,
          status: r.status, urgency: r.urgency, managerFeedback: r.managerFeedback || "",
          createdAt: r.createdAt, updatedAt: r.updatedAt,
        })),
      });
    }

    /* ------------------------------ SUPPLIER ------------------------------ */
    if (g.role === UserRole.SUPPLIER) {
      const vendorId = await resolveSupplierVendorId(g);
      if (!vendorId) {
        return NextResponse.json({
          role: "SUPPLIER", linked: false,
          message: "Your login is not linked to a vendor profile yet. Ask an administrator to link it.",
        });
      }

      const mine = { vendorId, orderStatus: { $ne: "DRAFT" } }; // suppliers never see internal drafts
      const [vendor, byStatus, revenue, outstanding, recent, upcoming, productCount] = await Promise.all([
        Vendor.findById(vendorId).select("name companyName email verificationStatus").lean(),
        PurchaseOrder.aggregate([
          { $match: mine },
          { $group: { _id: "$orderStatus", count: { $sum: 1 }, amount: { $sum: "$totalAmount" } } },
        ]),
        PurchaseOrder.aggregate([
          { $match: { vendorId: new mongoose.Types.ObjectId(vendorId), orderStatus: "DELIVERED", paymentStatus: "PAID" } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),
        PurchaseOrder.aggregate([
          { $match: { vendorId: new mongoose.Types.ObjectId(vendorId), orderStatus: { $in: ["CONFIRMED", "SHIPPED", "DELIVERED"] }, paymentStatus: { $in: ["UNPAID", "PARTIAL"] } } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),
        PurchaseOrder.find(mine).sort({ createdAt: -1 }).limit(6).lean(),
        PurchaseOrder.find({ vendorId, orderStatus: { $in: ["CONFIRMED", "SHIPPED"] } }).sort({ expectedDeliveryDate: 1 }).limit(5).lean(),
        Product.countDocuments({ vendorId }),
      ]);

      const counts: Record<string, number> = {};
      byStatus.forEach((x: any) => { counts[x._id] = x.count; });

      return NextResponse.json({
        role: "SUPPLIER", linked: true,
        vendor,
        cards: {
          toShip: counts.CONFIRMED || 0,
          inTransit: counts.SHIPPED || 0,
          delivered: counts.DELIVERED || 0,
          awaitingApproval: counts.PENDING || 0,
          products: productCount,
          paidRevenue: revenue[0]?.total || 0,
          outstanding: outstanding[0]?.total || 0,
        },
        recent: recent.map((o: any) => ({
          id: String(o._id), poNumber: o.poNumber || `PO-${String(o._id).slice(-6).toUpperCase()}`,
          totalAmount: o.totalAmount, orderStatus: o.orderStatus, paymentStatus: o.paymentStatus,
          expectedDeliveryDate: o.expectedDeliveryDate, createdAt: o.createdAt,
        })),
        upcoming: upcoming.map((o: any) => ({
          id: String(o._id), poNumber: o.poNumber || `PO-${String(o._id).slice(-6).toUpperCase()}`,
          orderStatus: o.orderStatus, expectedDeliveryDate: o.expectedDeliveryDate, totalAmount: o.totalAmount,
        })),
      });
    }

    /* ------------------------------ ADMIN ------------------------------ */
    // Admin keeps the full analytics view, which is served by /api/analytics
    return NextResponse.json({ role: "ADMIN" });
  } catch (error) {
    return apiError(error);
  }
}
