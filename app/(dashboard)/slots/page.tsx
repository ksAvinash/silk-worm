"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createSlot, listSlotsByBusiness, type SlotRecord } from "@/lib/firebase/slots";

export default function SlotsPage() {
  const { profile } = useAuth();

  const [slots, setSlots] = useState<SlotRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Loading slots...");

  const [slotName, setSlotName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [hatchDate, setHatchDate] = useState("");
  const [eggCapacity, setEggCapacity] = useState("5000");

  const refreshSlots = useCallback(async () => {
    if (!profile?.businessId) {
      return;
    }

    setLoading(true);

    try {
      const rows = await listSlotsByBusiness(profile.businessId);
      setSlots(rows);
      setStatus(rows.length ? "" : "No slots yet. Create your first slot.");
    } catch (error) {
      setStatus(`Failed to load slots: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  }, [profile?.businessId]);

  useEffect(() => {
    void refreshSlots();
  }, [refreshSlots]);

  const submitSlot = async () => {
    if (!profile?.businessId) {
      return;
    }

    const capacity = Number(eggCapacity);

    if (!slotName || !startDate || !hatchDate || !capacity || capacity <= 0) {
      setStatus("Enter valid slot name, dates, and egg capacity.");
      return;
    }

    try {
      await createSlot({
        businessId: profile.businessId,
        slotName,
        startDate,
        hatchDate,
        eggCapacity: capacity
      });

      setSlotName("");
      setStartDate("");
      setHatchDate("");
      setEggCapacity("5000");
      setStatus("Slot created.");
      await refreshSlots();
    } catch (error) {
      setStatus(`Failed to create slot: ${String(error)}`);
    }
  };

  return (
    <>
      <h1>Slots</h1>
      <div className="card">
        <h3>Create Slot</h3>
        <p className="muted">All records are scoped to your breeder workspace and isolated from other breeders.</p>
        <div className="grid">
          <label>
            Slot Name
            <input value={slotName} onChange={(e) => setSlotName(e.target.value)} placeholder="Mar-Week1" />
          </label>
          <label>
            Start Date
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label>
            Hatch Date
            <input type="date" value={hatchDate} onChange={(e) => setHatchDate(e.target.value)} />
          </label>
          <label>
            Egg Capacity
            <input
              type="number"
              value={eggCapacity}
              onChange={(e) => setEggCapacity(e.target.value)}
              min={1}
              step={1}
            />
          </label>
        </div>
        <button style={{ marginTop: 12 }} onClick={submitSlot}>
          Save Slot
        </button>
      </div>

      <div className="card">
        <h3>My Slots</h3>
        {loading ? <p>Loading...</p> : null}
        {!loading && !slots.length ? <p className="muted">No slots available.</p> : null}
        {slots.map((slot) => (
          <article key={slot.id} className="card">
            <div className="badge">{slot.status}</div>
            <h4>{slot.slotName}</h4>
            <p className="muted">
              {slot.startDate} to {slot.hatchDate}
            </p>
            <p>
              Capacity: {slot.eggCapacity} | Booked: {slot.bookedQty} | Available: {slot.availableQty}
            </p>
          </article>
        ))}
        {status ? <p className="muted">{status}</p> : null}
      </div>
    </>
  );
}
