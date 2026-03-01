import {
  addDoc,
  deleteDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { businessCollection, businessDoc } from "./business";

export type FarmerStatus = "active" | "inactive";

export interface FarmerRecord {
  id: string;
  name: string;
  phone: string;
  altPhone: string;
  village: string;
  address: string;
  status: FarmerStatus;
  notes: string;
}

interface CreateFarmerInput {
  businessId: string;
  name: string;
  phone: string;
  altPhone: string;
  village: string;
  address: string;
  status?: FarmerStatus;
  notes?: string;
}

interface UpdateFarmerInput {
  businessId: string;
  farmerId: string;
  name: string;
  phone: string;
  altPhone: string;
  village: string;
  address: string;
  status: FarmerStatus;
  notes: string;
}

function normalizeStatus(value: unknown): FarmerStatus {
  return value === "inactive" ? "inactive" : "active";
}

export async function listFarmersByBusiness(businessId: string): Promise<FarmerRecord[]> {
  const q = query(businessCollection(businessId, "farmers"), orderBy("name", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((row) => {
    const data = row.data();

    return {
      id: row.id,
      name: String(data.name || ""),
      phone: String(data.phone || ""),
      altPhone: String(data.altPhone || ""),
      village: String(data.village || ""),
      address: String(data.address || ""),
      status: normalizeStatus(data.status),
      notes: String(data.notes || "")
    };
  });
}

export async function createFarmer(input: CreateFarmerInput): Promise<void> {
  await addDoc(businessCollection(input.businessId, "farmers"), {
    name: input.name.trim(),
    phone: input.phone.trim(),
    altPhone: input.altPhone.trim(),
    village: input.village.trim(),
    address: input.address.trim(),
    status: input.status || "active",
    notes: String(input.notes || "").trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateFarmer(input: UpdateFarmerInput): Promise<void> {
  await updateDoc(businessDoc(input.businessId, "farmers", input.farmerId), {
    name: input.name.trim(),
    phone: input.phone.trim(),
    altPhone: input.altPhone.trim(),
    village: input.village.trim(),
    address: input.address.trim(),
    status: input.status,
    notes: input.notes.trim(),
    updatedAt: serverTimestamp()
  });
}

export async function deleteFarmer(businessId: string, farmerId: string): Promise<void> {
  await deleteDoc(businessDoc(businessId, "farmers", farmerId));
}
