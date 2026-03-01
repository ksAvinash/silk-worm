import { Timestamp, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./config";
import type { SlotRecord } from "./slots";

export interface DashboardMetrics {
  totalSlots: number;
  slotsThisWeek: number;
  openSlots: number;
  totalCapacity: number;
  totalBooked: number;
  totalBalance: number;
  utilizationPercent: number;
  farmersCount: number;
  bookingsCount: number;
  invoicesCount: number;
  pendingDue: number;
  collectedAmount: number;
  recentBookings: Array<{
    id: string;
    bookingDate: string;
    farmerName: string;
    slotName: string;
    qtyBooked: number;
    status: string;
  }>;
}

function startOfWeekDate() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function asNumber(value: unknown) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

function asDateString(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString().slice(0, 10);
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  return "";
}

export async function getDashboardMetrics(businessId: string): Promise<DashboardMetrics> {
  const [slotSnapshot, farmerSnapshot, bookingSnapshot, invoiceSnapshot, paymentSnapshot] = await Promise.all([
    getDocs(query(collection(db, "slots"), where("businessId", "==", businessId))),
    getDocs(query(collection(db, "farmers"), where("businessId", "==", businessId))),
    getDocs(query(collection(db, "bookings"), where("businessId", "==", businessId))),
    getDocs(query(collection(db, "invoices"), where("businessId", "==", businessId))),
    getDocs(query(collection(db, "payments"), where("businessId", "==", businessId)))
  ]);

  const slots: SlotRecord[] = slotSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      businessId: String(data.businessId || ""),
      slotName: String(data.slotName || ""),
      startDate: String(data.startDate || ""),
      hatchDate: String(data.hatchDate || ""),
      eggCapacity: asNumber(data.eggCapacity),
      wormCapacity: asNumber(data.wormCapacity),
      bookedQty: asNumber(data.bookedQty),
      availableQty: asNumber(data.availableQty),
      status: (data.status || "planned") as SlotRecord["status"]
    };
  });

  const weekStart = toIsoDate(startOfWeekDate());
  const totalCapacity = slots.reduce((sum, row) => sum + row.eggCapacity, 0);
  const totalBooked = slots.reduce((sum, row) => sum + row.bookedQty, 0);
  const totalBalance = slots.reduce((sum, row) => sum + row.availableQty, 0);
  const openSlots = slots.filter((row) => row.status === "open").length;
  const slotsThisWeek = slots.filter((row) => row.startDate >= weekStart).length;

  const pendingDue = invoiceSnapshot.docs.reduce((sum, row) => sum + asNumber(row.data().dueAmount), 0);
  const collectedAmount = paymentSnapshot.docs.reduce((sum, row) => sum + asNumber(row.data().amount), 0);

  const farmers = farmerSnapshot.docs.map((row) => ({ id: row.id, ...row.data() }));
  const farmerNameById = new Map(farmers.map((row) => [row.id, String(row.name || "Farmer")]));
  const slotNameById = new Map(slots.map((row) => [row.id, row.slotName]));

  const recentBookings = bookingSnapshot.docs
    .map((row) => {
      const data = row.data();
      return {
        id: row.id,
        bookingDate: asDateString(data.bookingDate),
        farmerName: farmerNameById.get(String(data.farmerId || "")) || "Farmer",
        slotName: slotNameById.get(String(data.slotId || "")) || "Slot",
        qtyBooked: asNumber(data.qtyBooked),
        status: String(data.status || "booked")
      };
    })
    .sort((a, b) => b.bookingDate.localeCompare(a.bookingDate))
    .slice(0, 6)
    .map((row) => row);

  const utilizationPercent = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;

  return {
    totalSlots: slots.length,
    slotsThisWeek,
    openSlots,
    totalCapacity,
    totalBooked,
    totalBalance,
    utilizationPercent,
    farmersCount: farmerSnapshot.size,
    bookingsCount: bookingSnapshot.size,
    invoicesCount: invoiceSnapshot.size,
    pendingDue,
    collectedAmount,
    recentBookings
  };
}
