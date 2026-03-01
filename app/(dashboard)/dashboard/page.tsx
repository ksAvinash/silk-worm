"use client";

import { useAuth } from "@/components/AuthProvider";

export default function DashboardPage() {
  const { business } = useAuth();

  return (
    <>
      <h1>Operations Dashboard</h1>
      <p className="muted">
        Welcome back{business?.name ? `, ${business.name}` : ""}.
      </p>
      <div className="grid">
        <article className="card">
          <div className="badge">This Week</div>
          <h3>Slots</h3>
          <p>Check your upcoming and current batches.</p>
        </article>
        <article className="card">
          <div className="badge">Bookings</div>
          <h3>Farmer Bookings</h3>
          <p>See who booked and how many worms are needed.</p>
        </article>
        <article className="card">
          <div className="badge">Inventory</div>
          <h3>Ready to Dispatch</h3>
          <p>Track available worms for delivery.</p>
        </article>
        <article className="card">
          <div className="badge">Billing</div>
          <h3>Pending Collection</h3>
          <p>View pending payments and recent collections.</p>
        </article>
      </div>
    </>
  );
}
