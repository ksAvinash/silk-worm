import { Timestamp, getDocs } from "firebase/firestore";
import { businessCollection } from "./business";

export interface MonthlySummary {
  totalRevenue: number;
  totalBookings: number;
  averagePerDay: number;
  projectedRevenue: number;
  invoicesRaised: number;
  amountCollected: number;
  pendingDue: number;
  activeSlots: number;
}

export interface FarmerBreakdownRow {
  farmerId: string;
  farmerName: string;
  bookings: number;
  quantity: number;
  revenue: number;
}

export interface SlotUtilizationRow {
  slotId: string;
  slotName: string;
  capacity: number;
  booked: number;
  balance: number;
  utilizationPercent: number;
  status: string;
}

export interface DailyTrendPoint {
  day: number;
  value: number;
  unitsBooked: number;
}

export interface ReportsPayload {
  summary: MonthlySummary;
  farmerBreakdown: FarmerBreakdownRow[];
  slotUtilization: SlotUtilizationRow[];
  dailyTrend: DailyTrendPoint[];
}

interface BookingRow {
  id: string;
  farmerId: string;
  qtyBooked: number;
  subtotal: number;
  status: string;
  bookingDate: string;
}

interface InvoiceRow {
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
  invoiceDate: string;
}

interface PaymentRow {
  amount: number;
  paymentDate: string;
}

interface FarmerRow {
  id: string;
  name: string;
}

interface SlotRow {
  id: string;
  slotName: string;
  eggCapacity: number;
  bookedQty: number;
  availableQty: number;
  status: string;
}

function asNumber(value: unknown) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

function asDateString(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString().slice(0, 10);
  }
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    const date = (value as { toDate: () => Date }).toDate();
    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  return "";
}

function pickDateString(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const resolved = asDateString(data[key]);
    if (resolved) return resolved;
  }
  return "";
}

function monthMeta(month: string) {
  const [yearRaw, monthRaw] = month.split("-");
  const year = Number(yearRaw);
  const monthNum = Number(monthRaw);
  const totalDays = new Date(year, monthNum, 0).getDate();

  const now = new Date();
  const isCurrent = now.getFullYear() === year && now.getMonth() + 1 === monthNum;
  const elapsedDays = isCurrent ? now.getDate() : totalDays;

  return { year, monthNum, totalDays, elapsedDays };
}

function isInMonth(dateValue: string, month: string) {
  return dateValue.startsWith(`${month}-`);
}

export async function getReportsPayload(businessId: string, month: string): Promise<ReportsPayload> {
  const [bookingSnap, invoiceSnap, paymentSnap, farmerSnap, slotSnap] = await Promise.all([
    getDocs(businessCollection(businessId, "bookings")),
    getDocs(businessCollection(businessId, "invoices")),
    getDocs(businessCollection(businessId, "payments")),
    getDocs(businessCollection(businessId, "farmers")),
    getDocs(businessCollection(businessId, "slots"))
  ]);

  const bookings: BookingRow[] = bookingSnap.docs.map((row) => {
    const data = row.data();
    return {
      id: row.id,
      farmerId: String(data.farmerId || ""),
      qtyBooked: asNumber(data.qtyBooked),
      subtotal: asNumber(data.subtotal),
      status: String(data.status || "booked").toLowerCase(),
      bookingDate: pickDateString(data, ["bookingDate", "date", "createdAt", "updatedAt"])
    };
  });

  const invoices: InvoiceRow[] = invoiceSnap.docs.map((row) => {
    const data = row.data();
    return {
      totalAmount: asNumber(data.totalAmount),
      paidAmount: asNumber(data.paidAmount),
      dueAmount: asNumber(data.dueAmount),
      status: String(data.status || "issued").toLowerCase(),
      invoiceDate: pickDateString(data, ["invoiceDate", "date", "createdAt", "updatedAt"])
    };
  });

  const payments: PaymentRow[] = paymentSnap.docs.map((row) => {
    const data = row.data();
    return {
      amount: asNumber(data.amount),
      paymentDate: pickDateString(data, ["paymentDate", "date", "createdAt", "updatedAt"])
    };
  });

  const farmers: FarmerRow[] = farmerSnap.docs.map((row) => {
    const data = row.data();
    return {
      id: row.id,
      name: String(data.name || "Farmer")
    };
  });

  const slots: SlotRow[] = slotSnap.docs.map((row) => {
    const data = row.data();
    return {
      id: row.id,
      slotName: String(data.slotName || row.id),
      eggCapacity: asNumber(data.eggCapacity),
      bookedQty: asNumber(data.bookedQty),
      availableQty: asNumber(data.availableQty),
      status: String(data.status || "open")
    };
  });

  const farmerNameById = new Map(farmers.map((f) => [f.id, f.name]));
  const monthBookings = bookings.filter((booking) => isInMonth(booking.bookingDate, month) && booking.status !== "cancelled");
  const monthInvoices = invoices.filter((invoice) => isInMonth(invoice.invoiceDate, month));
  const monthPayments = payments.filter((payment) => isInMonth(payment.paymentDate, month));

  const totalRevenue = monthBookings.reduce((sum, booking) => sum + booking.subtotal, 0);
  const totalBookings = monthBookings.length;
  const invoicesRaised = monthInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const amountCollected = monthPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const pendingDue = monthInvoices.reduce((sum, invoice) => sum + invoice.dueAmount, 0);

  const { totalDays, elapsedDays } = monthMeta(month);
  const averagePerDay = totalRevenue / Math.max(1, elapsedDays);
  const projectedRevenue = averagePerDay * totalDays;

  const activeSlots = slots.filter((slot) => slot.status === "open").length;

  const farmerStats = new Map<string, FarmerBreakdownRow>();
  for (const booking of monthBookings) {
    const key = booking.farmerId || "unknown";
    const prev = farmerStats.get(key) || {
      farmerId: key,
      farmerName: farmerNameById.get(key) || "Farmer",
      bookings: 0,
      quantity: 0,
      revenue: 0
    };

    prev.bookings += 1;
    prev.quantity += booking.qtyBooked;
    prev.revenue += booking.subtotal;
    farmerStats.set(key, prev);
  }

  const farmerBreakdown = Array.from(farmerStats.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

  const slotUtilization = slots
    .map((slot) => {
      const capacity = slot.eggCapacity;
      const booked = slot.bookedQty;
      const balance = slot.availableQty;
      const utilizationPercent = capacity > 0 ? Math.round((booked / capacity) * 100) : 0;

      return {
        slotId: slot.id,
        slotName: slot.slotName,
        capacity,
        booked,
        balance,
        utilizationPercent,
        status: slot.status
      };
    })
    .sort((a, b) => b.utilizationPercent - a.utilizationPercent)
    .slice(0, 8);

  const dailyTotals = Array.from({ length: totalDays }, () => 0);
  const dailyUnits = Array.from({ length: totalDays }, () => 0);
  for (const booking of monthBookings) {
    const day = Number(booking.bookingDate.split("-")[2] || 0);
    if (day >= 1 && day <= totalDays) {
      dailyTotals[day - 1] += booking.subtotal;
      dailyUnits[day - 1] += booking.qtyBooked;
    }
  }

  const dailyTrend = dailyTotals.map((value, index) => ({
    day: index + 1,
    value,
    unitsBooked: dailyUnits[index] || 0
  }));

  return {
    summary: {
      totalRevenue,
      totalBookings,
      averagePerDay,
      projectedRevenue,
      invoicesRaised,
      amountCollected,
      pendingDue,
      activeSlots
    },
    farmerBreakdown,
    slotUtilization,
    dailyTrend
  };
}
