"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import CustomDropdown, { type DropdownOption } from "@/components/ui/CustomDropdown";
import SearchInput from "@/components/ui/SearchInput";
import { useAuth } from "@/components/AuthProvider";
import { createBooking, listBookingsByBusiness, type BookingRecord, type BookingStatus } from "@/lib/firebase/bookings";
import { listSlotsByBusiness, type SlotRecord } from "@/lib/firebase/slots";
import { listFarmersByBusiness, type FarmerRecord } from "@/lib/firebase/farmers";
import styles from "./bookings.module.css";

const statusOptions: DropdownOption[] = [
  { label: "Booked", value: "booked" },
  { label: "Dispatched", value: "dispatched" },
  { label: "Cancelled", value: "cancelled" }
];

function statusClass(status: BookingStatus) {
  if (status === "dispatched") return styles.statusDispatched;
  if (status === "cancelled") return styles.statusCancelled;
  return styles.statusBooked;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value || 0);
}

export default function BookingsPage() {
  const { profile } = useAuth();

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [slots, setSlots] = useState<SlotRecord[]>([]);
  const [farmers, setFarmers] = useState<FarmerRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Loading...");
  const [showForm, setShowForm] = useState(false);
  const [searchText, setSearchText] = useState("");

  const [slotId, setSlotId] = useState("");
  const [farmerId, setFarmerId] = useState("");
  const [qtyBooked, setQtyBooked] = useState("0");
  const [ratePerWorm, setRatePerWorm] = useState("0");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>("booked");

  const refreshData = useCallback(async () => {
    if (!profile?.businessId) return;

    setLoading(true);
    try {
      const [nextBookings, nextSlots, nextFarmers] = await Promise.all([
        listBookingsByBusiness(profile.businessId),
        listSlotsByBusiness(profile.businessId),
        listFarmersByBusiness(profile.businessId)
      ]);

      setBookings(nextBookings);
      setSlots(nextSlots);
      setFarmers(nextFarmers);
      setStatus(nextBookings.length ? "" : "No bookings yet. Add your first booking.");
    } catch {
      setStatus("Could not load bookings. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }, [profile?.businessId]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const resetForm = () => {
    setSlotId("");
    setFarmerId("");
    setQtyBooked("0");
    setRatePerWorm("0");
    setBookingDate("");
    setBookingStatus("booked");
  };

  const slotOptions = useMemo<DropdownOption[]>(() => {
    return slots
      .filter((slot) => slot.status === "open" && slot.availableQty > 0)
      .map((slot) => ({
        value: slot.id,
        label: `${slot.slotName} (avail ${formatNumber(slot.availableQty)})`
      }));
  }, [slots]);

  const farmerOptions = useMemo<DropdownOption[]>(() => {
    return farmers
      .filter((farmer) => farmer.status === "active")
      .map((farmer) => ({
        value: farmer.id,
        label: farmer.name
      }));
  }, [farmers]);

  const slotNameById = useMemo(() => new Map(slots.map((slot) => [slot.id, slot.slotName])), [slots]);
  const farmerNameById = useMemo(() => new Map(farmers.map((farmer) => [farmer.id, farmer.name])), [farmers]);
  const selectedSlot = useMemo(() => slots.find((slot) => slot.id === slotId) || null, [slotId, slots]);
  const selectedFarmer = useMemo(() => farmers.find((farmer) => farmer.id === farmerId) || null, [farmerId, farmers]);

  useEffect(() => {
    if (!farmerId) {
      setRatePerWorm("0");
      return;
    }

    setRatePerWorm(String(selectedFarmer?.ratePerWorm || 0));
  }, [farmerId, selectedFarmer?.ratePerWorm]);

  const filteredBookings = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return bookings;

    return bookings.filter((booking) => {
      const slotName = String(slotNameById.get(booking.slotId) || "").toLowerCase();
      const farmerName = String(farmerNameById.get(booking.farmerId) || "").toLowerCase();
      return (
        slotName.includes(query) ||
        farmerName.includes(query) ||
        booking.status.toLowerCase().includes(query) ||
        String(booking.qtyBooked).includes(query)
      );
    });
  }, [bookings, farmerNameById, searchText, slotNameById]);

  const handleCreateBooking = async () => {
    if (!profile?.businessId) return;

    const qty = Number(qtyBooked || 0);
    if (!slotId || !farmerId || !bookingDate || qty <= 0) {
      setStatus("Select slot/farmer/date and enter a valid quantity.");
      return;
    }

    const available = Number(selectedSlot?.availableQty || 0);
    if (qty > available) {
      setStatus(`Only ${available} worms are available in selected slot.`);
      return;
    }

    try {
      await createBooking({
        businessId: profile.businessId,
        slotId,
        farmerId,
        qtyBooked: qty,
        ratePerWorm: Number(ratePerWorm || 0),
        bookingDate,
        status: bookingStatus
      });

      setStatus("Booking created.");
      setShowForm(false);
      resetForm();
      await refreshData();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save booking. Please try again.");
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Bookings</p>
          <h1>Farmer Bookings</h1>
          <p className={styles.lead}>Link farmers to open slots and create booking entries with quantity and date.</p>
        </div>
        <button
          className={styles.primaryCta}
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          Add Booking
        </button>
      </header>

      <section className={styles.list}>
        <div className={styles.listHeader}>
          <h2>Booking List</h2>
          {loading ? <span>Loading...</span> : null}
        </div>

        <div className={styles.searchBar}>
          <SearchInput value={searchText} onChange={setSearchText} placeholder="Search by slot, farmer, status, or quantity" />
        </div>

        {status && !loading ? (
          <p className={status.includes("Could not") ? styles.error : styles.message}>{status}</p>
        ) : null}

        {!loading && filteredBookings.length === 0 ? <p className={styles.empty}>No bookings available.</p> : null}

        {filteredBookings.length > 0 ? (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Farmer</th>
                  <th>Slot</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Subtotal</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td data-label="Date">{booking.bookingDate || "-"}</td>
                    <td className={styles.name} data-label="Farmer">
                      {farmerNameById.get(booking.farmerId) || "Farmer"}
                    </td>
                    <td data-label="Slot">{slotNameById.get(booking.slotId) || "Slot"}</td>
                    <td data-label="Qty">{formatNumber(booking.qtyBooked)}</td>
                    <td data-label="Rate">{formatNumber(booking.ratePerWorm)}</td>
                    <td data-label="Subtotal">{formatNumber(booking.subtotal)}</td>
                    <td data-label="Status">
                      <span className={`${styles.statusPill} ${statusClass(booking.status)}`}>{booking.status}</span>
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
              <h2>Add Booking</h2>
              <button type="button" className={styles.closeBtn} onClick={() => setShowForm(false)}>
                ✕
              </button>
            </div>

            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                void handleCreateBooking();
              }}
            >
              <label className={styles.field}>
                Slot
                <CustomDropdown options={slotOptions} value={slotId} onChange={setSlotId} placeholder="Select slot" />
              </label>

              <label className={styles.field}>
                Farmer
                <CustomDropdown options={farmerOptions} value={farmerId} onChange={setFarmerId} placeholder="Select farmer" />
              </label>

              <label className={styles.field}>
                Booking Date
                <CustomDatePicker value={bookingDate} onChange={setBookingDate} placeholder="Select booking date" />
              </label>

              <label className={styles.field}>
                Quantity
                <input type="number" min={1} step={1} value={qtyBooked} onChange={(event) => setQtyBooked(event.target.value)} required />
              </label>

              <label className={styles.field}>
                Rate per Worm
                <input type="number" min={0} step={1} value={ratePerWorm} onChange={(event) => setRatePerWorm(event.target.value)} />
              </label>

              <label className={styles.field}>
                Status
                <CustomDropdown
                  options={statusOptions}
                  value={bookingStatus}
                  onChange={(next) => setBookingStatus(next as BookingStatus)}
                />
              </label>

              <p className={styles.hint}>Available in selected slot: {formatNumber(selectedSlot?.availableQty || 0)}</p>

              <div className={styles.actions}>
                <button type="button" className={styles.secondaryBtn} onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit">Create Booking</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
