import { User } from "firebase/auth";
import { collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "./config";

export type UserRole = "owner" | "manager" | "operator";

export interface BusinessProfile {
  id: string;
  name: string;
  ownerUid: string;
  slotFrequencyDays: number;
  invoicePrefix: string;
  logoUrl?: string;
  language?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  bankDetails?: {
    accountName?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    branch?: string;
    upiId?: string;
  };
}

export interface BusinessSettingsUpdate {
  name: string;
  invoicePrefix: string;
  slotFrequencyDays: number;
  logoUrl?: string;
  language?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  bankDetails?: {
    accountName?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    branch?: string;
    upiId?: string;
  };
}

export interface UserProfile {
  uid: string;
  businessId: string;
  role: UserRole;
  phone: string;
  displayName: string;
}

function defaultBusinessName(phone?: string | null) {
  if (!phone) {
    return "Silk Worm Business";
  }

  const masked = `${phone.slice(0, 4)}****${phone.slice(-3)}`;
  return `Breeder ${masked}`;
}

function defaultInvoicePrefix() {
  const year = new Date().getFullYear().toString().slice(-2);
  return `SW${year}`;
}

async function ensureBusinessUserDoc(profile: UserProfile) {
  if (!profile.businessId) return;

  const teamUserRef = doc(db, "businesses", profile.businessId, "users", profile.uid);
  const teamSnap = await getDoc(teamUserRef);
  if (teamSnap.exists()) return;

  await setDoc(teamUserRef, {
    role: profile.role || "owner",
    phone: profile.phone || "",
    displayName: profile.displayName || "Owner",
    active: true,
    notes: "",
    permissions: {
      slots: "edit",
      farmers: "edit",
      bookings: "edit",
      invoices: "edit",
      reports: "edit",
      users: "edit",
      settings: "edit"
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

async function createBusinessForOwner(user: User): Promise<UserProfile> {
  const businessRef = doc(collection(db, "businesses"));
  const userRef = doc(db, "users", user.uid);
  const teamUserRef = doc(db, "businesses", businessRef.id, "users", user.uid);

  const businessPayload = {
    name: defaultBusinessName(user.phoneNumber),
    ownerUid: user.uid,
    slotFrequencyDays: 7,
    invoicePrefix: defaultInvoicePrefix(),
    createdAt: serverTimestamp()
  };

  const userPayload: Omit<UserProfile, "uid"> & { createdAt: unknown } = {
    businessId: businessRef.id,
    role: "owner",
    phone: user.phoneNumber || "",
    displayName: user.displayName || "Owner",
    createdAt: serverTimestamp()
  };

  await setDoc(businessRef, businessPayload);
  await setDoc(userRef, userPayload);
  await setDoc(teamUserRef, {
    role: "owner",
    phone: user.phoneNumber || "",
    displayName: user.displayName || "Owner",
    active: true,
    notes: "",
    permissions: {
      slots: "edit",
      farmers: "edit",
      bookings: "edit",
      invoices: "edit",
      reports: "edit",
      users: "edit",
      settings: "edit"
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return {
    uid: user.uid,
    businessId: businessRef.id,
    role: "owner",
    phone: user.phoneNumber || "",
    displayName: user.displayName || "Owner"
  };
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const data = snap.data() as Omit<UserProfile, "uid">;
    const profile = { uid: user.uid, ...data };
    void ensureBusinessUserDoc(profile).catch((error) => {
      // Do not block login redirect if backfill fails.
      console.warn("Could not backfill business user profile", error);
    });
    return profile;
  }

  return createBusinessForOwner(user);
}

export async function getBusinessProfile(businessId: string): Promise<BusinessProfile | null> {
  const businessRef = doc(db, "businesses", businessId);
  const snap = await getDoc(businessRef);

  if (!snap.exists()) {
    return null;
  }

  const data = snap.data() as Omit<BusinessProfile, "id">;
  return { id: snap.id, ...data };
}

export async function getCurrentUserByPhone(phone: string): Promise<UserProfile | null> {
  const q = query(collection(db, "users"), where("phone", "==", phone), limit(1));
  const results = await getDocs(q);

  if (results.empty) {
    return null;
  }

  const row = results.docs[0];
  const data = row.data() as Omit<UserProfile, "uid">;
  return { uid: row.id, ...data };
}

export async function updateBusinessLogo(businessId: string, logoUrl: string): Promise<void> {
  const businessRef = doc(db, "businesses", businessId);
  await updateDoc(businessRef, { logoUrl });
}

export async function updateBusinessSettings(businessId: string, payload: BusinessSettingsUpdate): Promise<void> {
  const businessRef = doc(db, "businesses", businessId);

  await updateDoc(businessRef, {
    name: payload.name,
    invoicePrefix: payload.invoicePrefix,
    slotFrequencyDays: Number(payload.slotFrequencyDays || 0),
    logoUrl: payload.logoUrl || "",
    language: payload.language || "en-IN",
    address: {
      line1: payload.address?.line1 || "",
      line2: payload.address?.line2 || "",
      city: payload.address?.city || "",
      state: payload.address?.state || "",
      pincode: payload.address?.pincode || "",
      country: payload.address?.country || ""
    },
    bankDetails: {
      accountName: payload.bankDetails?.accountName || "",
      bankName: payload.bankDetails?.bankName || "",
      accountNumber: payload.bankDetails?.accountNumber || "",
      ifscCode: payload.bankDetails?.ifscCode || "",
      branch: payload.bankDetails?.branch || "",
      upiId: payload.bankDetails?.upiId || ""
    },
    updatedAt: serverTimestamp()
  });
}
