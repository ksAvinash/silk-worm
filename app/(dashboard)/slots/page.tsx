"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import CustomDropdown, { type DropdownOption } from "@/components/ui/CustomDropdown";
import SearchInput from "@/components/ui/SearchInput";
import { useAuth } from "@/components/AuthProvider";
import { createSlot, listSlotsByBusiness, type SlotRecord } from "@/lib/firebase/slots";
import styles from "./slots.module.css";

const statusOptions: DropdownOption[] = [
  { label: "Planned", value: "planned" },
  { label: "Hatching", value: "hatching" },
  { label: "Open", value: "open" },
  { label: "Closed", value: "closed" }
];

function statusClass(status: SlotRecord["status"]) {
  if (status === "planned") return styles.statusPlanned;
  if (status === "hatching") return styles.statusHatching;
  if (status === "open") return styles.statusOpen;
  return styles.statusClosed;
}

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
    if (!profile?.businessId) return;

    setLoading(true);
    try {
      const rows = await listSlotsByBusiness(profile.businessId);
      setSlots(rows);
      setStatus(rows.length ? "" : "No slots yet. Add your first slot.");
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

  const handleCreateSlot = async () => {
    if (!profile?.businessId) return;
    if (!validateForm()) return;

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
      setShowForm(false);
      resetForm();
      await refreshSlots();
    } catch {
      setStatus("Could not save slot. Please try again.");
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
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Slots</p>
          <h1>Hatch Slots</h1>
          <p className={styles.lead}>Create and track weekly slot capacity, booked quantity, and balance stock.</p>
        </div>
        <button
          className={styles.primaryCta}
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          Add Slot
        </button>
      </header>

      <section className={styles.list}>
        <div className={styles.listHeader}>
          <h2>Slot List</h2>
          {loading ? <span>Loading...</span> : null}
        </div>

        <div className={styles.searchBar}>
          <SearchInput
            value={searchText}
            onChange={setSearchText}
            placeholder="Search by slot name, status, or capacity"
          />
        </div>

        {status && !loading ? (
          <p className={status.includes("Could not") ? styles.error : styles.message}>{status}</p>
        ) : null}

        {!loading && filteredSlots.length === 0 ? <p className={styles.empty}>No slots available.</p> : null}

        {filteredSlots.length > 0 ? (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Slot</th>
                  <th>Start Date</th>
                  <th>Hatch Date</th>
                  <th>Total</th>
                  <th>Booked</th>
                  <th>Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSlots.map((slot) => (
                  <tr key={slot.id}>
                    <td className={styles.name} data-label="Slot">
                      {slot.slotName}
                    </td>
                    <td data-label="Start Date">{slot.startDate || "-"}</td>
                    <td data-label="Hatch Date">{slot.hatchDate || "-"}</td>
                    <td data-label="Total">{slot.eggCapacity}</td>
                    <td data-label="Booked">{slot.bookedQty}</td>
                    <td data-label="Balance">{slot.availableQty}</td>
                    <td data-label="Status">
                      <span className={`${styles.statusPill} ${statusClass(slot.status)}`}>{slot.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {showForm ? (
        <div className={styles.modalOverlay} onClick={() => setShowForm(false)}>
          <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Add Slot</h2>
              <button type="button" className={styles.closeBtn} onClick={() => setShowForm(false)}>
                ✕
              </button>
            </div>

            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                void handleCreateSlot();
              }}
            >
              <label className={styles.field}>
                Slot Name
                <input value={slotName} onChange={(e) => setSlotName(e.target.value)} placeholder="Mar-Week1" required />
              </label>

              <label className={styles.field}>
                Start Date
                <CustomDatePicker value={startDate} onChange={setStartDate} placeholder="Select start date" />
              </label>

              <label className={styles.field}>
                Hatch Date
                <CustomDatePicker value={hatchDate} onChange={setHatchDate} placeholder="Select hatch date" />
              </label>

              <label className={styles.field}>
                Egg Capacity
                <input
                  type="number"
                  value={eggCapacity}
                  onChange={(e) => setEggCapacity(e.target.value)}
                  min={1}
                  step={1}
                  required
                />
              </label>

              <label className={styles.field}>
                Slot Status
                <CustomDropdown
                  options={statusOptions}
                  value={slotStatus}
                  onChange={(next) => setSlotStatus(next as SlotRecord["status"])}
                  searchable
                  searchPlaceholder="Search status"
                />
              </label>

              <div className={styles.actions}>
                <button type="button" className={styles.secondaryBtn} onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit">Create Slot</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
