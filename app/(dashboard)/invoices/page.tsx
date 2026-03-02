"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import QRCode from "qrcode";
import { getDownloadURL, ref } from "firebase/storage";
import SearchInput from "@/components/ui/SearchInput";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import CustomDropdown, { type DropdownOption } from "@/components/ui/CustomDropdown";
import { useAuth } from "@/components/AuthProvider";
import { listBookingsByBusiness, type BookingRecord } from "@/lib/firebase/bookings";
import { listFarmersByBusiness, type FarmerRecord } from "@/lib/firebase/farmers";
import { listSlotsByBusiness, type SlotRecord } from "@/lib/firebase/slots";
import { createInvoiceFromBookings, listInvoicesByBusiness, type InvoiceRecord, type InvoiceStatus } from "@/lib/firebase/invoices";
import { getBusinessProfile, type BusinessProfile } from "@/lib/firebase/tenant";
import { storage } from "@/lib/firebase/config";
import styles from "./invoices.module.css";

const invoiceStatusOptions: DropdownOption[] = [
  { label: "Issued", value: "issued" },
  { label: "Draft", value: "draft" },
  { label: "Paid", value: "paid" }
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
  if (status === "paid") return styles.statusPaid;
  return styles.statusIssued;
}

export default function InvoicesPage() {
  const { profile, business } = useAuth();

  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [farmers, setFarmers] = useState<FarmerRecord[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [slots, setSlots] = useState<SlotRecord[]>([]);
  const [invoiceBusiness, setInvoiceBusiness] = useState<BusinessProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Loading...");
  const [showForm, setShowForm] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceRecord | null>(null);
  const [invoiceQrDataUrl, setInvoiceQrDataUrl] = useState("");
  const [fallbackLogoUrl, setFallbackLogoUrl] = useState("");
  const [searchText, setSearchText] = useState("");

  const [farmerId, setFarmerId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(todayIsoDate());
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus>("issued");
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);

  const refreshData = useCallback(async () => {
    if (!profile?.businessId) return;

    setLoading(true);
    try {
      const [nextInvoices, nextFarmers, nextBookings, nextSlots, nextBusiness] = await Promise.all([
        listInvoicesByBusiness(profile.businessId),
        listFarmersByBusiness(profile.businessId),
        listBookingsByBusiness(profile.businessId),
        listSlotsByBusiness(profile.businessId),
        getBusinessProfile(profile.businessId)
      ]);

      setInvoices(nextInvoices);
      setFarmers(nextFarmers);
      setBookings(nextBookings);
      setSlots(nextSlots);
      setInvoiceBusiness(nextBusiness);
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

  useEffect(() => {
    if (!showForm) return;
    setSelectedBookingIds(availableBookings.map((booking) => booking.id));
  }, [availableBookings, showForm]);

  const selectedBookingsTotal = useMemo(() => {
    return availableBookings
      .filter((booking) => selectedBookingIds.includes(booking.id))
      .reduce((sum, booking) => sum + (Number(booking.subtotal) || 0), 0);
  }, [availableBookings, selectedBookingIds]);

  const farmerNameById = useMemo(() => new Map(farmers.map((farmer) => [farmer.id, farmer.name])), [farmers]);
  const farmerById = useMemo(() => new Map(farmers.map((farmer) => [farmer.id, farmer])), [farmers]);
  const bookingById = useMemo(() => new Map(bookings.map((booking) => [booking.id, booking])), [bookings]);
  const slotNameById = useMemo(() => new Map(slots.map((slot) => [slot.id, slot.slotName])), [slots]);

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

  const handleDownloadInvoice = async (invoice: InvoiceRecord) => {
    const element = document.getElementById(`invoice-content-${invoice.id}`);
    if (!element) return;

    const previousStyles = {
      width: element.style.width,
      maxWidth: element.style.maxWidth,
      margin: element.style.margin,
      minHeight: element.style.minHeight
    };

    element.style.width = "794px";
    element.style.maxWidth = "none";
    element.style.margin = "0";
    element.style.minHeight = "1122px";

    try {
      const images = Array.from(element.querySelectorAll("img"));
      await Promise.all(
        images.map(
          (image) =>
            new Promise<void>((resolve) => {
              if (image.complete && image.naturalWidth > 0) {
                resolve();
                return;
              }

              const done = () => resolve();
              image.addEventListener("load", done, { once: true });
              image.addEventListener("error", done, { once: true });
            })
        )
      );

      const renderScale = 1.5;
      const jpegQuality = 0.78;
      const canvas = await html2canvas(element, {
        scale: renderScale,
        useCORS: true,
        allowTaint: false
      });

      const imgData = canvas.toDataURL("image/jpeg", jpegQuality);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;
      const scale = maxWidth / canvas.width;
      const imgWidth = canvas.width * scale;
      const imgHeight = canvas.height * scale;
      const pageHeightPx = maxHeight / scale;

      if (imgHeight <= maxHeight) {
        pdf.addImage(imgData, "JPEG", margin, margin, imgWidth, imgHeight);
      } else {
        let y = 0;
        let pageIndex = 0;

        while (y < canvas.height) {
          const sliceHeight = Math.min(pageHeightPx, canvas.height - y);
          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceHeight;

          const pageContext = pageCanvas.getContext("2d");
          if (!pageContext) break;

          pageContext.drawImage(canvas, 0, y, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

          const pageData = pageCanvas.toDataURL("image/jpeg", jpegQuality);
          if (pageIndex > 0) {
            pdf.addPage();
          }

          pdf.addImage(pageData, "JPEG", margin, margin, imgWidth, sliceHeight * scale);
          y += sliceHeight;
          pageIndex += 1;
        }
      }

      pdf.save(`${invoice.invoiceNo}.pdf`);
    } finally {
      element.style.width = previousStyles.width;
      element.style.maxWidth = previousStyles.maxWidth;
      element.style.margin = previousStyles.margin;
      element.style.minHeight = previousStyles.minHeight;
    }
  };

  const previewBookings = useMemo(() => {
    if (!previewInvoice) return [];
    return previewInvoice.bookingIds
      .map((bookingId) => bookingById.get(bookingId))
      .filter((booking): booking is BookingRecord => Boolean(booking));
  }, [bookingById, previewInvoice]);

  const previewFarmer = previewInvoice ? farmerById.get(previewInvoice.farmerId) : null;
  const previewSubtotal = useMemo(
    () => previewBookings.reduce((sum, booking) => sum + (Number(booking.subtotal) || 0), 0),
    [previewBookings]
  );
  const previewTotal = Number(previewInvoice?.totalAmount || 0);
  const previewTax = Math.max(0, previewTotal - previewSubtotal);
  const invoiceQrPayload = useMemo(() => {
    if (!previewInvoice) return "";
    const farmerName = farmerNameById.get(previewInvoice.farmerId) || "Farmer";
    const businessName = invoiceBusiness?.name || business?.name || "Business";
    return [
      `Invoice No: ${previewInvoice.invoiceNo}`,
      `Date: ${previewInvoice.invoiceDate || "-"}`,
      `Business: ${businessName}`,
      `Farmer: ${farmerName}`,
      `Total: ${formatCurrency(previewTotal)}`
    ].join("\n");
  }, [business?.name, farmerNameById, invoiceBusiness?.name, previewInvoice, previewTotal]);

  useEffect(() => {
    let isMounted = true;

    if (!invoiceQrPayload) {
      setInvoiceQrDataUrl("");
      return;
    }

    void QRCode.toDataURL(invoiceQrPayload, {
      width: 176,
      margin: 1,
      errorCorrectionLevel: "M"
    })
      .then((dataUrl) => {
        if (!isMounted) return;
        setInvoiceQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!isMounted) return;
        setInvoiceQrDataUrl("");
      });

    return () => {
      isMounted = false;
    };
  }, [invoiceQrPayload]);

  useEffect(() => {
    let isMounted = true;

    if (invoiceBusiness?.logoUrl || business?.logoUrl) {
      setFallbackLogoUrl("");
      return () => {
        isMounted = false;
      };
    }

    if (!profile?.businessId) {
      setFallbackLogoUrl("");
      return () => {
        isMounted = false;
      };
    }

    const logoRef = ref(storage, `businesses/${profile.businessId}/company-logo.png`);
    void getDownloadURL(logoRef)
      .then((url) => {
        if (!isMounted) return;
        setFallbackLogoUrl(url);
      })
      .catch(() => {
        if (!isMounted) return;
        setFallbackLogoUrl("");
      });

    return () => {
      isMounted = false;
    };
  }, [business?.logoUrl, invoiceBusiness?.logoUrl, profile?.businessId]);

  const effectiveBusiness = invoiceBusiness || business;
  const effectiveLogoUrl = invoiceBusiness?.logoUrl || business?.logoUrl || fallbackLogoUrl;
  const address = effectiveBusiness?.address;
  const bank = effectiveBusiness?.bankDetails;
  const businessAddressLine = [address?.line1, address?.line2, address?.city, address?.state, address?.pincode, address?.country]
    .filter(Boolean)
    .join(", ");

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
                  <th>Actions</th>
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
                    <td data-label="Actions" className={styles.rowActions}>
                      <div className={styles.inlineActions}>
                        <button
                          type="button"
                          className={styles.previewBtn}
                          onClick={() => setPreviewInvoice(invoice)}
                          aria-label="Preview invoice"
                          title="Preview"
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                            <path
                              d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className={styles.downloadBtn}
                          onClick={() => handleDownloadInvoice(invoice)}
                          aria-label="Download invoice"
                          title="Download"
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                            <path
                              d="M12 3v11M8 10l4 4 4-4M4 20h16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>
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

      {previewInvoice ? (
        <div className={styles.modalOverlay} onClick={() => setPreviewInvoice(null)}>
          <div className={styles.previewModal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Invoice Preview</h2>
              <button type="button" className={styles.closeBtn} onClick={() => setPreviewInvoice(null)}>
                ✕
              </button>
            </div>

            <div id={`invoice-content-${previewInvoice.id}`} className={styles.invoiceDetails}>
              <div className={styles.invoiceSheet}>
                <section className={styles.invoiceLeft}>
                  <div className={styles.invoiceTopBlock}>
                    <div className={styles.partyDetails}>
                      <div className={styles.invoiceBrand}>
                        {effectiveLogoUrl ? (
                          <img
                            src={effectiveLogoUrl}
                            alt="Company logo"
                            className={styles.invoiceLogo}
                            crossOrigin="anonymous"
                          />
                        ) : null}
                        <div>
                          <p className={styles.invoiceLabel}>Business Details</p>
                          <h3>{effectiveBusiness?.name || "Business"}</h3>
                          {businessAddressLine ? <p className={styles.companyAddress}>{businessAddressLine}</p> : null}
                        </div>
                      </div>

                      <div className={styles.billedTo}>
                        <p className={styles.billedLabel}>Farmer Details</p>
                        <h4>{farmerNameById.get(previewInvoice.farmerId) || "Farmer"}</h4>
                        {previewFarmer?.address ? <p className={styles.billedAddress}>{previewFarmer.address}</p> : null}
                      </div>

                      <div className={styles.invoiceNoBlock}>
                        <p className={styles.invoiceLabel}>Invoice No</p>
                        <h3>{previewInvoice.invoiceNo}</h3>
                      </div>
                    </div>
                  </div>

                  <div className={styles.invoiceNoDivider} />

                  <div className={styles.lineItems}>
                    <div className={`${styles.lineItem} ${styles.lineItemHeader}`}>
                      <span className={styles.column}>Date</span>
                      <span className={styles.column}>Slot</span>
                      <span className={styles.column}>Qty</span>
                      <span className={styles.column}>Rate</span>
                      <span className={styles.column}>Amount</span>
                    </div>
                    {previewBookings.map((booking) => (
                      <div key={booking.id} className={styles.lineItem}>
                        <span className={styles.column}>{booking.bookingDate || "-"}</span>
                        <span className={styles.column}>{slotNameById.get(booking.slotId) || "Slot"}</span>
                        <span className={styles.column}>{formatNumber(booking.qtyBooked)}</span>
                        <span className={styles.column}>{formatNumber(booking.ratePerWorm)}</span>
                        <span className={styles.column}>{formatCurrency(booking.subtotal)}</span>
                      </div>
                    ))}
                  </div>

                  <div className={styles.totals}>
                    <div className={styles.totalRow}>
                      <span>Subtotal</span>
                      <span>{formatCurrency(previewSubtotal)}</span>
                    </div>
                    <div className={styles.totalRow}>
                      <span>Tax</span>
                      <span>{formatCurrency(previewTax)}</span>
                    </div>
                    <div className={`${styles.totalRow} ${styles.final}`}>
                      <span>Total</span>
                      <span>{formatCurrency(previewTotal)}</span>
                    </div>
                  </div>

                  {bank ? (
                    <footer className={styles.bankDetails}>
                      <p className={styles.billedLabel}>Bank Details</p>
                      {bank.accountName ? <p>Account Name: {bank.accountName}</p> : null}
                      {bank.bankName ? <p>Bank Name: {bank.bankName}</p> : null}
                      {bank.accountNumber ? <p>Account Number: {bank.accountNumber}</p> : null}
                      {bank.ifscCode ? <p>IFSC: {bank.ifscCode}</p> : null}
                      {bank.branch ? <p>Branch: {bank.branch}</p> : null}
                      {bank.upiId ? <p>UPI: {bank.upiId}</p> : null}
                    </footer>
                  ) : null}
                </section>

                <aside className={styles.invoiceRight}>
                  <div className={styles.rightCard}>
                    <p className={styles.invoiceDate}>Invoice Date: {previewInvoice.invoiceDate || "-"}</p>
                  </div>

                  <div className={styles.rightCard}>
                    <p className={styles.invoiceLabel}>Invoice QR</p>
                    {invoiceQrDataUrl ? (
                      <img src={invoiceQrDataUrl} alt="Invoice QR code" className={styles.invoiceQr} />
                    ) : (
                      <p className={styles.qrFallback}>Unable to generate QR code.</p>
                    )}
                  </div>
                </aside>
              </div>
            </div>

            <div className={styles.actions} data-html2canvas-ignore="true">
              <button type="button" className={styles.secondaryBtn} onClick={() => setPreviewInvoice(null)}>
                Close
              </button>
              <button
                type="button"
                className={styles.downloadBtn}
                onClick={() => void handleDownloadInvoice(previewInvoice)}
                aria-label="Download invoice PDF"
                title="Download PDF"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <path
                    d="M12 3v11M8 10l4 4 4-4M4 20h16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
