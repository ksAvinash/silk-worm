import { addDoc, getDoc, getDocs, orderBy, query, serverTimestamp, doc } from "firebase/firestore";
import { businessCollection, businessDoc } from "./business";
import { db } from "./config";
import type { BookingRecord } from "./bookings";

export type InvoiceStatus = "draft" | "issued" | "paid";

export interface InvoiceRecord {
  id: string;
  farmerId: string;
  bookingIds: string[];
  invoiceNo: string;
  invoiceDate: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: InvoiceStatus;
}

interface CreateInvoiceInput {
  businessId: string;
  farmerId: string;
  bookingIds: string[];
  invoiceDate: string;
  status?: InvoiceStatus;
}

function normalizeStatus(value: unknown): InvoiceStatus {
  if (value === "draft" || value === "paid") {
    return value;
  }
  return "issued";
}

function asNumber(value: unknown) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

function todayCompact() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function asDateString(value: unknown) {
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return "";
}

async function buildInvoiceNo(businessId: string): Promise<string> {
  const businessSnap = await getDoc(doc(db, "businesses", businessId));
  const prefix = String(businessSnap.data()?.invoicePrefix || "INV").toUpperCase();
  return `${prefix}-${todayCompact()}-${randomSuffix()}`;
}

export async function listInvoicesByBusiness(businessId: string): Promise<InvoiceRecord[]> {
  const q = query(businessCollection(businessId, "invoices"), orderBy("invoiceDate", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((row) => {
    const data = row.data();
    return {
      id: row.id,
      farmerId: String(data.farmerId || ""),
      bookingIds: Array.isArray(data.bookingIds) ? data.bookingIds.map((value) => String(value)) : [],
      invoiceNo: String(data.invoiceNo || row.id),
      invoiceDate: asDateString(data.invoiceDate),
      totalAmount: asNumber(data.totalAmount),
      paidAmount: asNumber(data.paidAmount),
      dueAmount: asNumber(data.dueAmount),
      status: normalizeStatus(data.status)
    };
  });
}

export async function createInvoiceFromBookings(input: CreateInvoiceInput): Promise<void> {
  const farmerId = String(input.farmerId || "").trim();
  const bookingIds = (input.bookingIds || []).map((value) => String(value || "").trim()).filter(Boolean);

  if (!farmerId) {
    throw new Error("Select farmer.");
  }

  if (!bookingIds.length) {
    throw new Error("Select at least one booking.");
  }

  const bookingDocs = await Promise.all(
    bookingIds.map((bookingId) => getDoc(businessDoc(input.businessId, "bookings", bookingId)))
  );

  if (bookingDocs.some((snap) => !snap.exists())) {
    throw new Error("One or more selected bookings do not exist.");
  }

  const bookings = bookingDocs.map((snap) => snap.data() as BookingRecord & { farmerId?: string; subtotal?: number });

  if (bookings.some((booking) => String(booking.farmerId || "") !== farmerId)) {
    throw new Error("Selected bookings must belong to the same farmer.");
  }

  const totalAmount = bookings.reduce((sum, booking) => sum + asNumber(booking.subtotal), 0);
  const invoiceNo = await buildInvoiceNo(input.businessId);
  const status = input.status || "issued";

  await addDoc(businessCollection(input.businessId, "invoices"), {
    farmerId,
    bookingIds,
    invoiceNo,
    invoiceDate: input.invoiceDate,
    totalAmount,
    paidAmount: 0,
    dueAmount: totalAmount,
    status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}
