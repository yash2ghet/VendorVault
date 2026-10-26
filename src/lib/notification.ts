"use server";

import { revalidatePath } from "next/cache"; // 🌟 ADD THIS
import { connectDB } from "@/lib/mongodb";
import Notification from "@/models/Notification";

type NotificationType = "success" | "warning" | "info" | "error";

interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  description: string;
}

export async function createNotification({
  type,
  title,
  description,
}: CreateNotificationInput) {
  try {
    await connectDB();

    await Notification.create({
      type,
      title,
      description,
      read: false,
    });

    // 🌟 Force Next.js to flag data as dirty across the app layout
    revalidatePath("/api/notifications");
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error) {
    console.error("Notification Error:", error);
    return { success: false, error: "Failed to create notification." };
  }
}

// ... Keep your remaining getNotifications, markAllNotificationsRead, clearNotifications exactly as they are.

export async function getNotifications() {
  try {
    await connectDB();

    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .lean();

    return notifications.map((item: any) => ({
      _id: item._id.toString(),
      type: item.type,
      title: item.title,
      description: item.description,
      read: item.read,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function markAllNotificationsRead() {
  try {
    await connectDB();

    await Notification.updateMany(
      { read: false },
      {
        $set: {
          read: true,
        },
      }
    );

    return {
      success: true,
    };
  } catch (error) {
    console.error(error);

    return {
      success: false,
    };
  }
}

export async function clearNotifications() {
  try {
    await connectDB();

    await Notification.deleteMany({});

    return {
      success: true,
    };
  } catch (error) {
    console.error(error);

    return {
      success: false,
    };
  }
}