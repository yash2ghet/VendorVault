import { connectDB } from "@/config/database";
import { Vendor } from "@/models/Vendor";
import { ActivityLog } from "@/models/ActivityLog";
import { AuditAction } from "@/types";
import { CreateVendorInput, UpdateVendorInput } from "@/validators/vendor";

export class VendorService {
  static async getAll(query: { page?: number; limit?: number; status?: string }) {
    await connectDB();
    const page = query.page || 1;
    const limit = query.limit || 20;
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;

    const [vendors, total] = await Promise.all([
      Vendor.find(filter)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Vendor.countDocuments(filter),
    ]);

    return { vendors, total, page, totalPages: Math.ceil(total / limit) };
  }

  static async getById(id: string) {
    await connectDB();
    return Vendor.findById(id);
  }

  static async create(data: Omit<CreateVendorInput, "country"> & { country?: string }, userId: string, ip: string) {
    await connectDB();
    const vendor = await Vendor.create(data);

    await ActivityLog.create({
      userId,
      action: AuditAction.VENDOR_CREATE,
      entityType: "Vendor",
      entityId: vendor._id,
      ipAddress: ip,
    });

    return vendor;
  }

  static async update(id: string, data: UpdateVendorInput, userId: string, ip: string) {
    await connectDB();
    const vendor = await Vendor.findByIdAndUpdate(id, data, { new: true });

    await ActivityLog.create({
      userId,
      action: AuditAction.VENDOR_UPDATE,
      entityType: "Vendor",
      entityId: id,
      metadata: data,
      ipAddress: ip,
    });

    return vendor;
  }

  static async updateVerification(
    id: string,
    status: string,
    notes: string | undefined,
    userId: string,
    ip: string
  ) {
    await connectDB();
    const update: Record<string, unknown> = { verificationStatus: status };
    if (status === "VERIFIED") {
      update.verifiedBy = userId;
      update.verifiedAt = new Date();
    }
    if (notes) update.notes = notes;

    const vendor = await Vendor.findByIdAndUpdate(id, update, { new: true });

    await ActivityLog.create({
      userId,
      action: AuditAction.VENDOR_VERIFY,
      entityType: "Vendor",
      entityId: id,
      metadata: { status, notes },
      ipAddress: ip,
    });

    return vendor;
  }

  static async delete(id: string) {
    await connectDB();
    return Vendor.findByIdAndDelete(id);
  }
}
