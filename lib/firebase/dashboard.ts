import { Timestamp, getDocs } from "firebase/firestore";
import type { SlotRecord } from "./slots";
import { businessCollection } from "./business";

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

const EMPTY_SNAPSHOT = { docs: [], size: 0 } as const;

function settled<T>(result: PromiseSettledResult<T>, label: string): T | typeof EMPTY_SNAPSHOT {
  if (result.status === "fulfilled") return result.value;
  console.warn(`[dashboard] failed to load "${label}":`, result.reason);
  return EMPTY_SNAPSHOT as unknown as T;
}

export async function getDashboardMetrics(businessId: string): Promise<DashboardMetrics> {
  const results = await Promise.allSettled([
    getDocs(businessCollection(businessId, "slots")),
    getDocs(businessCollection(businessId, "farmers")),
    getDocs(businessCollection(businessId, "bookings")),
    getDocs(businessCollection(businessId, "invoices")),
    getDocs(businessCollection(businessId, "payments"))
  ]);

  const slotSnapshot    = settled(results[0], "slots");
  const farmerSnapshot  = settled(results[1], "farmers");
  const bookingSnapshot = settled(results[2], "bookings");
  const invoiceSnapshot = settled(results[3], "invoices");
  const paymentSnapshot = settled(results[4], "payments");

  const slots: SlotRecord[] = slotSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
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

  const farmerNameById = new Map(
    farmerSnapshot.docs.map((row) => {
      const data = row.data() as { name?: string };
      return [row.id, String(data.name || "Farmer")] as const;
    })
  );
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
