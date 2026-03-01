import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "./config";
import type { UserRole } from "./tenant";

export type PermissionLevel = "none" | "read" | "edit";

export type ModulePermissions = Record<string, PermissionLevel>;

export interface TeamUserRecord {
  id: string;
  businessId: string;
  role: UserRole;
  phone: string;
  displayName: string;
  active: boolean;
  notes: string;
  permissions: ModulePermissions;
}

interface CreateTeamUserInput {
  businessId: string;
  role: UserRole;
  phone: string;
  displayName: string;
  active: boolean;
  notes: string;
  permissions: ModulePermissions;
}

interface UpdateTeamUserInput {
  userId: string;
  role: UserRole;
  phone: string;
  displayName: string;
  active: boolean;
  notes: string;
  permissions: ModulePermissions;
}

function normalizePermissions(permissions: ModulePermissions): ModulePermissions {
  return Object.fromEntries(
    Object.entries(permissions).map(([moduleId, level]) => {
      if (level === "read" || level === "edit") {
        return [moduleId, level];
      }
      return [moduleId, "none"];
    })
  );
}

export async function listUsersByBusiness(businessId: string): Promise<TeamUserRecord[]> {
  const q = query(collection(db, "users"), where("businessId", "==", businessId));
  const snap = await getDocs(q);

  const rows = snap.docs.map((row) => {
    const data = row.data() as Partial<TeamUserRecord>;
    return {
      id: row.id,
      businessId: String(data.businessId || ""),
      role: (data.role || "operator") as UserRole,
      phone: String(data.phone || ""),
      displayName: String(data.displayName || "User"),
      active: data.active !== false,
      notes: String(data.notes || ""),
      permissions: normalizePermissions((data.permissions || {}) as ModulePermissions)
    };
  });

  return rows.sort((a, b) => {
    if (a.role === "owner" && b.role !== "owner") return -1;
    if (a.role !== "owner" && b.role === "owner") return 1;
    return a.displayName.localeCompare(b.displayName);
  });
}

export async function createTeamUser(input: CreateTeamUserInput): Promise<string> {
  const docRef = await addDoc(collection(db, "users"), {
    businessId: input.businessId,
    role: input.role,
    phone: input.phone,
    displayName: input.displayName,
    active: input.active,
    notes: input.notes,
    permissions: normalizePermissions(input.permissions),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return docRef.id;
}

export async function updateTeamUser(input: UpdateTeamUserInput): Promise<void> {
  await updateDoc(doc(db, "users", input.userId), {
    role: input.role,
    phone: input.phone,
    displayName: input.displayName,
    active: input.active,
    notes: input.notes,
    permissions: normalizePermissions(input.permissions),
    updatedAt: serverTimestamp()
  });
}

export async function removeTeamUser(userId: string): Promise<void> {
  await deleteDoc(doc(db, "users", userId));
}
