import {
  addDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  doc,
  collection
} from "firebase/firestore";
import { db } from "./config";
import { businessCollection, businessDoc } from "./business";

export type BookingStatus = "booked" | "dispatched" | "cancelled";

export interface BookingRecord {
  id: string;
  slotId: string;
  farmerId: string;
  qtyBooked: number;
  ratePerWorm: number;
  subtotal: number;
  bookingDate: string;
  status: BookingStatus;
}

interface CreateBookingInput {
  businessId: string;
  slotId: string;
  farmerId: string;
  qtyBooked: number;
  bookingDate: string;
  ratePerWorm?: number;
  status?: BookingStatus;
}

function normalizeStatus(value: unknown): BookingStatus {
  if (value === "dispatched" || value === "cancelled") {
    return value;
  }
  return "booked";
}

function asDateString(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return "";
}

export async function listBookingsByBusiness(businessId: string): Promise<BookingRecord[]> {
  const q = query(businessCollection(businessId, "bookings"), orderBy("bookingDate", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((row) => {
    const data = row.data();
    return {
      id: row.id,
      slotId: String(data.slotId || ""),
      farmerId: String(data.farmerId || ""),
      qtyBooked: Number(data.qtyBooked || 0),
      ratePerWorm: Number(data.ratePerWorm || 0),
      subtotal: Number(data.subtotal || 0),
      bookingDate: asDateString(data.bookingDate),
      status: normalizeStatus(data.status)
    };
  });
}

export async function createBooking(input: CreateBookingInput): Promise<void> {
  const qtyBooked = Number(input.qtyBooked || 0);
  if (!qtyBooked || qtyBooked <= 0) {
    throw new Error("Booked quantity must be greater than zero.");
  }

  const ratePerWorm = Number(input.ratePerWorm || 0);
  const status = input.status || "booked";

  const slotRef = businessDoc(input.businessId, "slots", input.slotId);
  const bookingsRef = collection(db, "businesses", input.businessId, "bookings");
  const bookingRef = doc(bookingsRef);

  await runTransaction(db, async (transaction) => {
    const slotSnap = await transaction.get(slotRef);

    if (!slotSnap.exists()) {
      throw new Error("Selected slot does not exist.");
    }

    const slot = slotSnap.data();
    const availableQty = Number(slot.availableQty || 0);
    const currentBookedQty = Number(slot.bookedQty || 0);

    if (qtyBooked > availableQty) {
      throw new Error(`Only ${availableQty} worms are available in this slot.`);
    }

    transaction.set(bookingRef, {
      slotId: input.slotId,
      farmerId: input.farmerId,
      qtyBooked,
      ratePerWorm,
      subtotal: qtyBooked * ratePerWorm,
      bookingDate: input.bookingDate,
      status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    transaction.update(slotRef, {
      bookedQty: currentBookedQty + qtyBooked,
      availableQty: availableQty - qtyBooked,
      updatedAt: serverTimestamp()
    });
  });
}
