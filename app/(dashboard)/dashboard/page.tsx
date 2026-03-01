"use client";

import { useAuth } from "@/components/AuthProvider";

export default function DashboardPage() {
  const { business, profile } = useAuth();

  return (
    <>
      <h1>Operations Dashboard</h1>
      <p className="muted">
        Workspace: <strong>{business?.name || "-"}</strong> | Role: <strong>{profile?.role || "-"}</strong>
      </p>
      <div className="grid">
        <article className="card">
          <div className="badge">This Week</div>
          <h3>Slots</h3>
          <p>Track planned and open hatch slots</p>
        </article>
        <article className="card">
          <div className="badge">Bookings</div>
          <h3>Farmers Assigned</h3>
          <p>Monitor booked quantities per slot</p>
        </article>
        <article className="card">
          <div className="badge">Inventory</div>
          <h3>Ready to Dispatch</h3>
          <p>Keep live stock movement updated</p>
        </article>
        <article className="card">
          <div className="badge">Billing</div>
          <h3>Pending Collection</h3>
          <p>Track invoices, collections, and dues</p>
        </article>
      </div>
    </>
  );
}
