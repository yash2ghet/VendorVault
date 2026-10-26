import { connectDB } from "@/config/database";
import { Product } from "@/models/Product";
import { ActivityLog } from "@/models/ActivityLog";
import { AuditAction } from "@/types";

export interface StockAlert {
  productId: string;
  productName: string;
  sku: string;
  currentQuantity: number;
  threshold: number;
  vendorId: string;
}

export class InventoryService {
  static async getLowStockProducts(): Promise<StockAlert[]> {
    await connectDB();
    const products = await Product.find({
      $expr: { $lte: ["$quantity", "$lowStockThreshold"] },
      status: "ACTIVE",
    }).populate("vendorId", "name email");

    return products.map((p) => ({
      productId: p._id.toString(),
      productName: p.name,
      sku: p.sku,
      currentQuantity: p.quantity,
      threshold: p.lowStockThreshold,
      vendorId: (p.vendorId as any)?._id?.toString() ?? "",
    }));
  }

  static async adjustStock(
    productId: string,
    quantityChange: number,
    userId: string,
    ip: string
  ) {
    await connectDB();
    const product = await Product.findByIdAndUpdate(
      productId,
      { $inc: { quantity: quantityChange } },
      { new: true }
    );

    if (product && product.quantity <= product.lowStockThreshold) {
      await ActivityLog.create({
        userId,
        action: AuditAction.LOW_STOCK_ALERT,
        entityType: "Product",
        entityId: productId,
        metadata: { quantity: product.quantity, threshold: product.lowStockThreshold },
        ipAddress: ip,
      });
    }

    return product;
  }
}
