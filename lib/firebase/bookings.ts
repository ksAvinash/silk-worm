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

interface UpdateBookingInput {
  businessId: string;
  bookingId: string;
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

export async function updateBooking(input: UpdateBookingInput): Promise<void> {
  const qtyBooked = Number(input.qtyBooked || 0);
  if (!qtyBooked || qtyBooked <= 0) {
    throw new Error("Booked quantity must be greater than zero.");
  }

  const ratePerWorm = Number(input.ratePerWorm || 0);
  const status = input.status || "booked";

  const bookingRef = businessDoc(input.businessId, "bookings", input.bookingId);

  await runTransaction(db, async (transaction) => {
    const bookingSnap = await transaction.get(bookingRef);
    if (!bookingSnap.exists()) {
      throw new Error("Booking not found.");
    }

    const previous = bookingSnap.data();
    const prevSlotId = String(previous.slotId || "");
    const prevQty = Number(previous.qtyBooked || 0);

    const nextSlotRef = businessDoc(input.businessId, "slots", input.slotId);
    const nextSlotSnap = await transaction.get(nextSlotRef);
    if (!nextSlotSnap.exists()) {
      throw new Error("Selected slot does not exist.");
    }

    if (prevSlotId === input.slotId) {
      const slot = nextSlotSnap.data();
      const availableQty = Number(slot.availableQty || 0);
      const currentBookedQty = Number(slot.bookedQty || 0);
      const effectiveAvailable = availableQty + prevQty;

      if (qtyBooked > effectiveAvailable) {
        throw new Error(`Only ${effectiveAvailable} worms are available in this slot.`);
      }

      transaction.update(nextSlotRef, {
        bookedQty: currentBookedQty - prevQty + qtyBooked,
        availableQty: availableQty + prevQty - qtyBooked,
        updatedAt: serverTimestamp()
      });
    } else {
      const prevSlotRef = businessDoc(input.businessId, "slots", prevSlotId);
      const prevSlotSnap = await transaction.get(prevSlotRef);
      if (!prevSlotSnap.exists()) {
        throw new Error("Original slot does not exist.");
      }

      const prevSlot = prevSlotSnap.data();
      const prevAvailableQty = Number(prevSlot.availableQty || 0);
      const prevBookedQty = Number(prevSlot.bookedQty || 0);

      const nextSlot = nextSlotSnap.data();
      const nextAvailableQty = Number(nextSlot.availableQty || 0);
      const nextBookedQty = Number(nextSlot.bookedQty || 0);

      if (qtyBooked > nextAvailableQty) {
        throw new Error(`Only ${nextAvailableQty} worms are available in selected slot.`);
      }

      transaction.update(prevSlotRef, {
        bookedQty: prevBookedQty - prevQty,
        availableQty: prevAvailableQty + prevQty,
        updatedAt: serverTimestamp()
      });

      transaction.update(nextSlotRef, {
        bookedQty: nextBookedQty + qtyBooked,
        availableQty: nextAvailableQty - qtyBooked,
        updatedAt: serverTimestamp()
      });
    }

    transaction.update(bookingRef, {
      slotId: input.slotId,
      farmerId: input.farmerId,
      qtyBooked,
      ratePerWorm,
      subtotal: qtyBooked * ratePerWorm,
      bookingDate: input.bookingDate,
      status,
      updatedAt: serverTimestamp()
    });
  });
}
