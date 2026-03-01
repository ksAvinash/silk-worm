"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import CustomDropdown, { type DropdownOption } from "@/components/ui/CustomDropdown";
import SearchInput from "@/components/ui/SearchInput";
import uiStyles from "@/components/ui/controls.module.css";
import { useAuth } from "@/components/AuthProvider";
import { createSlot, listSlotsByBusiness, type SlotRecord } from "@/lib/firebase/slots";

const statusOptions: DropdownOption[] = [
  { label: "Planned", value: "planned" },
  { label: "Hatching", value: "hatching" },
  { label: "Open", value: "open" },
  { label: "Closed", value: "closed" }
];

export default function SlotsPage() {
  const { profile } = useAuth();

  const [slots, setSlots] = useState<SlotRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Loading...");

  const [slotName, setSlotName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [hatchDate, setHatchDate] = useState("");
  const [eggCapacity, setEggCapacity] = useState("5000");
  const [slotStatus, setSlotStatus] = useState<SlotRecord["status"]>("planned");
  const [searchText, setSearchText] = useState("");
  const [showForm, setShowForm] = useState(false);

  const refreshSlots = useCallback(async () => {
    if (!profile?.businessId) {
      return;
    }

    setLoading(true);

    try {
      const rows = await listSlotsByBusiness(profile.businessId);
      setSlots(rows);
      setStatus(rows.length ? "" : "No slots yet. Create your first slot.");
    } catch {
      setStatus("Could not load slots. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }, [profile?.businessId]);

  useEffect(() => {
    void refreshSlots();
  }, [refreshSlots]);

  const resetForm = () => {
    setSlotName("");
    setStartDate("");
    setHatchDate("");
    setEggCapacity("5000");
    setSlotStatus("planned");
  };

  const validateForm = () => {
    const capacity = Number(eggCapacity);
    if (!slotName || !startDate || !hatchDate || !capacity || capacity <= 0) {
      setStatus("Please fill all fields with valid values.");
      return false;
    }

    return true;
  };

  const submitSlot = async (): Promise<boolean> => {
    if (!profile?.businessId) {
      return false;
    }

    if (!validateForm()) {
      return false;
    }

    const capacity = Number(eggCapacity);

    try {
      await createSlot({
        businessId: profile.businessId,
        slotName,
        startDate,
        hatchDate,
        eggCapacity: capacity,
        status: slotStatus
      });

      setStatus("Slot created.");
      await refreshSlots();
      return true;
    } catch {
      setStatus("Could not save slot. Please try again.");
      return false;
    }
  };

  const filteredSlots = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return slots;

    return slots.filter((slot) => {
      return (
        slot.slotName.toLowerCase().includes(query) ||
        slot.status.toLowerCase().includes(query) ||
        String(slot.eggCapacity).includes(query)
      );
    });
  }, [searchText, slots]);

  return (
    <>
      <div className="page-head-inline">
        <h1>Slots</h1>
        <button
          type="button"
          className="primary-inline-btn"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          Add Slot
        </button>
      </div>

      <div className="card">
        <h3>My Slots</h3>
        <div style={{ marginBottom: 12 }}>
          <SearchInput value={searchText} onChange={setSearchText} placeholder="Search by slot name, status, or capacity" />
        </div>

        {loading ? <p>Loading...</p> : null}
        {!loading && !filteredSlots.length ? <p className="muted">No slots available.</p> : null}
        {filteredSlots.map((slot) => (
          <article key={slot.id} className="card">
            <div className="badge">{slot.status}</div>
            <h4>{slot.slotName}</h4>
            <p className="muted">
              {slot.startDate} to {slot.hatchDate}
            </p>
            <p>
              Total: {slot.eggCapacity} | Booked: {slot.bookedQty} | Balance: {slot.availableQty}
            </p>
          </article>
        ))}
        {status ? <p className="muted">{status}</p> : null}
      </div>

      {showForm ? (
        <div className={uiStyles.modalOverlay} onClick={() => setShowForm(false)}>
          <div className={uiStyles.modal} onClick={(event) => event.stopPropagation()}>
            <div className={uiStyles.modalHeader}>
              <h3 className={uiStyles.modalTitle}>Add Slot</h3>
              <button type="button" className={uiStyles.closeBtn} onClick={() => setShowForm(false)}>
                ✕
              </button>
            </div>

            <form
              className={uiStyles.formGrid}
              onSubmit={async (event) => {
                event.preventDefault();
                const ok = await submitSlot();
                if (ok) {
                  setShowForm(false);
                  resetForm();
                }
              }}
            >
              <label className={uiStyles.field}>
                Slot Name
                <input value={slotName} onChange={(e) => setSlotName(e.target.value)} placeholder="Mar-Week1" />
              </label>

              <label className={uiStyles.field}>
                Egg Capacity
                <input
                  type="number"
                  value={eggCapacity}
                  onChange={(e) => setEggCapacity(e.target.value)}
                  min={1}
                  step={1}
                />
              </label>

              <label className={uiStyles.field}>
                Start Date
                <CustomDatePicker value={startDate} onChange={setStartDate} placeholder="Select start date" />
              </label>

              <label className={uiStyles.field}>
                Hatch Date
                <CustomDatePicker value={hatchDate} onChange={setHatchDate} placeholder="Select hatch date" />
              </label>

              <label className={uiStyles.field}>
                Slot Status
                <CustomDropdown
                  options={statusOptions}
                  value={slotStatus}
                  onChange={(next) => setSlotStatus(next as SlotRecord["status"])}
                  searchable
                  searchPlaceholder="Search status"
                />
              </label>

              <div className={uiStyles.modalActions}>
                <button type="button" className={uiStyles.secondaryBtn} onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit">Create Slot</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
