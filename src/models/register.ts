// Importing this file registers EVERY Mongoose model.
//
// Routes that use .populate("brandId") etc. need the referenced model (Brand, Category, Vendor...)
// to be registered, or Mongoose throws `Schema hasn't been registered for model "Brand"`.
// Whether it was registered used to depend on which other route happened to load first, so the
// failure looked random after a restart. connectDB() imports this, so it can't happen anymore.
import "./ActivityLog";
import "./AuditLog";
import "./Brand";
import "./Category";
import "./HardwareRequest";
import "./Notification";
import "./Order";
import "./Product";
import "./PurchaseOrder";
import "./User";
import "./Vendor";
