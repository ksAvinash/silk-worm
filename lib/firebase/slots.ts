import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "./config";

export interface SlotRecord {
  id: string;
  businessId: string;
  slotName: string;
  startDate: string;
  hatchDate: string;
  eggCapacity: number;
  wormCapacity: number;
  bookedQty: number;
  availableQty: number;
  status: "planned" | "hatching" | "open" | "closed";
}

interface CreateSlotInput {
  businessId: string;
  slotName: string;
  startDate: string;
  hatchDate: string;
  eggCapacity: number;
  status?: SlotRecord["status"];
}

function asDateString(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString().slice(0, 10);
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "string") {
    return value;
  }

  return "";
}

export async function listSlotsByBusiness(businessId: string): Promise<SlotRecord[]> {
  const q = query(collection(db, "slots"), where("businessId", "==", businessId), orderBy("startDate", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((row) => {
    const data = row.data();

    return {
      id: row.id,
      businessId: data.businessId,
      slotName: data.slotName,
      startDate: asDateString(data.startDate),
      hatchDate: asDateString(data.hatchDate),
      eggCapacity: Number(data.eggCapacity || 0),
      wormCapacity: Number(data.wormCapacity || 0),
      bookedQty: Number(data.bookedQty || 0),
      availableQty: Number(data.availableQty || 0),
      status: data.status || "planned"
    } as SlotRecord;
  });
}

export async function createSlot(input: CreateSlotInput): Promise<void> {
  const status = input.status || "planned";

  await addDoc(collection(db, "slots"), {
    businessId: input.businessId,
    slotName: input.slotName,
    startDate: input.startDate,
    hatchDate: input.hatchDate,
    eggCapacity: input.eggCapacity,
    wormCapacity: input.eggCapacity,
    bookedQty: 0,
    availableQty: input.eggCapacity,
    status,
    createdAt: serverTimestamp()
  });
}

interface UpdateSlotBasicsInput {
  slotId: string;
  slotName: string;
  eggCapacity: number;
  bookedQty: number;
}

export async function updateSlotBasics(input: UpdateSlotBasicsInput): Promise<void> {
  if (input.eggCapacity < input.bookedQty) {
    throw new Error("Capacity cannot be less than booked quantity.");
  }

  const slotRef = doc(db, "slots", input.slotId);
  const availableQty = input.eggCapacity - input.bookedQty;

  await updateDoc(slotRef, {
    slotName: input.slotName,
    eggCapacity: input.eggCapacity,
    wormCapacity: input.eggCapacity,
    availableQty
  });
}
