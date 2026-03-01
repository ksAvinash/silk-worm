"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SearchInput from "@/components/ui/SearchInput";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import CustomDropdown, { type DropdownOption } from "@/components/ui/CustomDropdown";
import { useAuth } from "@/components/AuthProvider";
import { listBookingsByBusiness, type BookingRecord } from "@/lib/firebase/bookings";
import { listFarmersByBusiness, type FarmerRecord } from "@/lib/firebase/farmers";
import { createInvoiceFromBookings, listInvoicesByBusiness, type InvoiceRecord, type InvoiceStatus } from "@/lib/firebase/invoices";
import styles from "./invoices.module.css";

const invoiceStatusOptions: DropdownOption[] = [
  { label: "Issued", value: "issued" },
  { label: "Draft", value: "draft" },
  { label: "Overdue", value: "overdue" }
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value || 0);
}

function formatCurrency(value: number) {
  return `Rs ${formatNumber(Math.round(value || 0))}`;
}

function todayIsoDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function statusClass(status: InvoiceStatus) {
  if (status === "draft") return styles.statusDraft;
  if (status === "partial") return styles.statusPartial;
  if (status === "paid") return styles.statusPaid;
  if (status === "overdue") return styles.statusOverdue;
  return styles.statusIssued;
}

export default function InvoicesPage() {
  const { profile } = useAuth();

  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [farmers, setFarmers] = useState<FarmerRecord[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Loading...");
  const [showForm, setShowForm] = useState(false);
  const [searchText, setSearchText] = useState("");

  const [farmerId, setFarmerId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(todayIsoDate());
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus>("issued");
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);

  const refreshData = useCallback(async () => {
    if (!profile?.businessId) return;

    setLoading(true);
    try {
      const [nextInvoices, nextFarmers, nextBookings] = await Promise.all([
        listInvoicesByBusiness(profile.businessId),
        listFarmersByBusiness(profile.businessId),
        listBookingsByBusiness(profile.businessId)
      ]);

      setInvoices(nextInvoices);
      setFarmers(nextFarmers);
      setBookings(nextBookings);
      setStatus(nextInvoices.length ? "" : "No invoices yet. Create your first invoice.");
    } catch {
      setStatus("Could not load invoices. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }, [profile?.businessId]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const resetForm = () => {
    setFarmerId("");
    setInvoiceDate(todayIsoDate());
    setInvoiceStatus("issued");
    setSelectedBookingIds([]);
  };

  const farmerOptions = useMemo<DropdownOption[]>(() => {
    return farmers
      .filter((farmer) => farmer.status === "active")
      .map((farmer) => ({ value: farmer.id, label: farmer.name }));
  }, [farmers]);

  const availableBookings = useMemo(() => {
    if (!farmerId) return [];

    return bookings.filter((booking) => {
      if (booking.farmerId !== farmerId) return false;
      if (booking.status === "cancelled") return false;

      const alreadyInvoiced = invoices.some((invoice) => invoice.bookingIds.includes(booking.id));
      return !alreadyInvoiced;
    });
  }, [bookings, farmerId, invoices]);

  const selectedBookingsTotal = useMemo(() => {
    return availableBookings
      .filter((booking) => selectedBookingIds.includes(booking.id))
      .reduce((sum, booking) => sum + (Number(booking.subtotal) || 0), 0);
  }, [availableBookings, selectedBookingIds]);

  const farmerNameById = useMemo(() => new Map(farmers.map((farmer) => [farmer.id, farmer.name])), [farmers]);

  const filteredInvoices = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return invoices;

    return invoices.filter((invoice) => {
      const farmerName = String(farmerNameById.get(invoice.farmerId) || "").toLowerCase();
      return (
        invoice.invoiceNo.toLowerCase().includes(query) ||
        farmerName.includes(query) ||
        invoice.status.toLowerCase().includes(query)
      );
    });
  }, [farmerNameById, invoices, searchText]);

  const toggleBooking = (bookingId: string) => {
    setSelectedBookingIds((prev) => (prev.includes(bookingId) ? prev.filter((id) => id !== bookingId) : [...prev, bookingId]));
  };

  const handleCreateInvoice = async () => {
    if (!profile?.businessId) return;

    if (!farmerId || !invoiceDate || !selectedBookingIds.length) {
      setStatus("Select farmer, invoice date, and at least one booking.");
      return;
    }

    try {
      await createInvoiceFromBookings({
        businessId: profile.businessId,
        farmerId,
        bookingIds: selectedBookingIds,
        invoiceDate,
        status: invoiceStatus
      });

      setStatus("Invoice created.");
      setShowForm(false);
      resetForm();
      await refreshData();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not create invoice. Please try again.");
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Invoices</p>
          <h1>Invoice Management</h1>
          <p className={styles.lead}>Create invoices from farmer bookings and track paid, due, and status.</p>
        </div>
        <button
          className={styles.primaryCta}
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          Create Invoice
        </button>
      </header>

      <section className={styles.list}>
        <div className={styles.listHeader}>
          <h2>Invoices</h2>
          {loading ? <span>Loading...</span> : null}
        </div>

        <div className={styles.searchBar}>
          <SearchInput value={searchText} onChange={setSearchText} placeholder="Search by invoice no, farmer, or status" />
        </div>

        {status && !loading ? (
          <p className={status.includes("Could not") ? styles.error : styles.message}>{status}</p>
        ) : null}

        {!loading && filteredInvoices.length === 0 ? <p className={styles.empty}>No invoices available.</p> : null}

        {filteredInvoices.length > 0 ? (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Date</th>
                  <th>Farmer</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className={styles.name} data-label="Invoice No">
                      {invoice.invoiceNo}
                    </td>
                    <td data-label="Date">{invoice.invoiceDate || "-"}</td>
                    <td data-label="Farmer">{farmerNameById.get(invoice.farmerId) || "Farmer"}</td>
                    <td data-label="Total">{formatCurrency(invoice.totalAmount)}</td>
                    <td data-label="Paid">{formatCurrency(invoice.paidAmount)}</td>
                    <td data-label="Due">{formatCurrency(invoice.dueAmount)}</td>
                    <td data-label="Status">
                      <span className={`${styles.statusPill} ${statusClass(invoice.status)}`}>{invoice.status}</span>
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
              <h2>Create Invoice</h2>
              <button type="button" className={styles.closeBtn} onClick={() => setShowForm(false)}>
                ✕
              </button>
            </div>

            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                void handleCreateInvoice();
              }}
            >
              <label className={styles.field}>
                Farmer
                <CustomDropdown options={farmerOptions} value={farmerId} onChange={setFarmerId} placeholder="Select farmer" />
              </label>

              <label className={styles.field}>
                Invoice Date
                <CustomDatePicker value={invoiceDate} onChange={setInvoiceDate} placeholder="Select invoice date" />
              </label>

              <label className={styles.field}>
                Status
                <CustomDropdown
                  options={invoiceStatusOptions}
                  value={invoiceStatus}
                  onChange={(next) => setInvoiceStatus(next as InvoiceStatus)}
                />
              </label>

              <label className={styles.field}>
                Select Bookings
                <div className={styles.bookingList}>
                  {availableBookings.map((booking) => (
                    <div key={booking.id} className={styles.bookingItem}>
                      <label>
                        <input
                          type="checkbox"
                          checked={selectedBookingIds.includes(booking.id)}
                          onChange={() => toggleBooking(booking.id)}
                        />
                        <span>{booking.bookingDate || "-"} · Qty {formatNumber(booking.qtyBooked)}</span>
                      </label>
                      <span className={styles.bookingMeta}>{formatCurrency(booking.subtotal)}</span>
                    </div>
                  ))}

                  {!availableBookings.length ? (
                    <div className={styles.bookingItem}>
                      <span className={styles.bookingMeta}>No uninvoiced bookings available for selected farmer.</span>
                    </div>
                  ) : null}
                </div>
              </label>

              <p className={styles.hint}>Selected total: {formatCurrency(selectedBookingsTotal)}</p>

              <div className={styles.actions}>
                <button type="button" className={styles.secondaryBtn} onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit">Create Invoice</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
