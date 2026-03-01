import { collection, doc } from "firebase/firestore";
import { db } from "./config";

export type BusinessCollectionName =
  | "slots"
  | "farmers"
  | "bookings"
  | "inventoryLedger"
  | "invoices"
  | "payments"
  | "reports"
  | "users";

export function businessCollection(businessId: string, collectionName: BusinessCollectionName) {
  return collection(db, "businesses", businessId, collectionName);
}

export function businessDoc(businessId: string, collectionName: BusinessCollectionName, docId: string) {
  return doc(db, "businesses", businessId, collectionName, docId);
}
