"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { getDownloadURL, ref } from "firebase/storage";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { getBusinessProfile, type BusinessProfile } from "@/lib/firebase/tenant";
import { getInvoiceById, type InvoiceRecord } from "@/lib/firebase/invoices";
import { listFarmersByBusiness, type FarmerRecord } from "@/lib/firebase/farmers";
import { listBookingsByBusiness, type BookingRecord } from "@/lib/firebase/bookings";
import { listSlotsByBusiness } from "@/lib/firebase/slots";
import { storage } from "@/lib/firebase/config";
import styles from "./view.module.css";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value || 0);
}

function formatCurrency(value: number) {
  return `Rs ${formatNumber(Math.round(value || 0))}`;
}

function InvoiceViewerPageContent() {
  const params = useParams<{ businessId: string; invoiceId: string }>();
  const { profile } = useAuth();

  const businessId = String(params?.businessId || "");
  const invoiceId = String(params?.invoiceId || "");

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Loading invoice...");
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [farmer, setFarmer] = useState<FarmerRecord | null>(null);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [slotsById, setSlotsById] = useState<Map<string, string>>(new Map());
  const [pdfUrl, setPdfUrl] = useState("");
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [fallbackLogoUrl, setFallbackLogoUrl] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!businessId || !invoiceId || !profile) return;

      if (profile.businessId !== businessId) {
        setStatus("You do not have access to this invoice.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setStatus("Loading invoice...");

      try {
        const [nextBusiness, nextInvoice, allFarmers, allBookings, allSlots] = await Promise.all([
          getBusinessProfile(businessId),
          getInvoiceById(businessId, invoiceId),
          listFarmersByBusiness(businessId),
          listBookingsByBusiness(businessId),
          listSlotsByBusiness(businessId)
        ]);

        if (!nextBusiness || !nextInvoice) {
          setStatus("Invoice not found.");
          setBusiness(nextBusiness);
          setInvoice(null);
          setFarmer(null);
          setBookings([]);
          setSlotsById(new Map());
          return;
        }

        const bookingById = new Map(allBookings.map((booking) => [booking.id, booking]));
        const nextBookings = nextInvoice.bookingIds
          .map((bookingDocId) => bookingById.get(bookingDocId))
          .filter((row): row is BookingRecord => Boolean(row));

        const nextFarmer = allFarmers.find((row) => row.id === nextInvoice.farmerId) || null;
        const nextSlotsById = new Map(allSlots.map((slot) => [slot.id, slot.slotName]));

        setBusiness(nextBusiness);
        setInvoice(nextInvoice);
        setFarmer(nextFarmer);
        setBookings(nextBookings);
        setSlotsById(nextSlotsById);
        setStatus("");
      } catch {
        setStatus("Could not load invoice right now.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [businessId, invoiceId, profile]);

  useEffect(() => {
    let isMounted = true;

    if (!businessId) return () => {
      isMounted = false;
    };

    if (business?.logoUrl) {
      setFallbackLogoUrl("");
      return () => {
        isMounted = false;
      };
    }

    const logoRef = ref(storage, `businesses/${businessId}/company-logo.png`);
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
  }, [business?.logoUrl, businessId]);

  const effectiveLogoUrl = business?.logoUrl || fallbackLogoUrl;
  const businessAddress = useMemo(() => {
    const address = business?.address;
    return [address?.line1, address?.line2, address?.city, address?.state, address?.pincode, address?.country]
      .filter(Boolean)
      .join(", ");
  }, [business?.address]);

  const subtotal = Number(invoice?.totalAmount || 0);
  const tax = 0;
  const total = subtotal + tax;

  useEffect(() => {
    const generate = async () => {
      if (!invoice) return;

      const element = document.getElementById("invoice-pdf-source");
      if (!element) return;

      setGeneratingPdf(true);

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

        const canvas = await html2canvas(element, {
          scale: 1.5,
          useCORS: true,
          allowTaint: false
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.82);
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const maxWidth = pageWidth - margin * 2;
        const maxHeight = pageHeight - margin * 2;
        const scale = maxWidth / canvas.width;
        const imgWidth = canvas.width * scale;
        const imgHeight = canvas.height * scale;

        if (imgHeight <= maxHeight) {
          pdf.addImage(imgData, "JPEG", margin, margin, imgWidth, imgHeight);
        } else {
          const pageHeightPx = maxHeight / scale;
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
            const pageData = pageCanvas.toDataURL("image/jpeg", 0.82);

            if (pageIndex > 0) {
              pdf.addPage();
            }

            pdf.addImage(pageData, "JPEG", margin, margin, imgWidth, sliceHeight * scale);
            y += sliceHeight;
            pageIndex += 1;
          }
        }

        const blob = pdf.output("blob");
        const nextUrl = URL.createObjectURL(blob);
        setPdfUrl((prev) => {
          if (prev) {
            URL.revokeObjectURL(prev);
          }
          return nextUrl;
        });
      } catch {
        setStatus("Could not generate invoice PDF view.");
      } finally {
        setGeneratingPdf(false);
      }
    };

    void generate();

    return () => {
      setPdfUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return "";
      });
    };
  }, [businessAddress, bookings, effectiveLogoUrl, farmer, invoice, slotsById, subtotal, tax, total]);

  const invoiceLink = useMemo(() => {
    if (!businessId || !invoiceId) return "";
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/+$/, "");
    if (!baseUrl) return "";
    return `${baseUrl}/businesses/${businessId}/invoices/${invoiceId}`;
  }, [businessId, invoiceId]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Invoice PDF View</h1>
          {invoice ? <p className={styles.meta}>Invoice No: {invoice.invoiceNo}</p> : null}
          {invoiceLink ? <p className={styles.meta}>{invoiceLink}</p> : null}
        </div>
        {pdfUrl && invoice ? (
          <a href={pdfUrl} download={`${invoice.invoiceNo}.pdf`} className={styles.downloadBtn}>
            Download PDF
          </a>
        ) : null}
      </header>

      {loading ? <p className={styles.message}>Loading invoice...</p> : null}
      {!loading && status ? <p className={styles.message}>{status}</p> : null}
      {!loading && !status && generatingPdf ? <p className={styles.message}>Generating PDF...</p> : null}

      {!loading && !status && pdfUrl ? <iframe className={styles.frame} src={pdfUrl} title="Invoice PDF" /> : null}

      {invoice ? (
        <div id="invoice-pdf-source" className={styles.hiddenSource}>
          <div className={styles.invoiceRoot}>
            <div className={styles.invoiceHeader}>
              <div className={styles.leftBlock}>
                {effectiveLogoUrl ? <img src={effectiveLogoUrl} alt="Company logo" className={styles.logo} crossOrigin="anonymous" /> : null}
                <p className={styles.label}>Business Details</p>
                <h2>{business?.name || "Business"}</h2>
                {businessAddress ? <p className={styles.text}>{businessAddress}</p> : null}

                <p className={styles.label}>Farmer Details</p>
                <h3>{farmer?.name || "Farmer"}</h3>
                {farmer?.address ? <p className={styles.text}>{farmer.address}</p> : null}

                <p className={styles.label}>Invoice No</p>
                <h3>{invoice.invoiceNo}</h3>
              </div>

              <div className={styles.rightBlock}>
                <p className={styles.dateLine}>Invoice Date: {invoice.invoiceDate || "-"}</p>
              </div>
            </div>

            <div className={styles.divider} />

            <div className={styles.table}>
              <div className={`${styles.row} ${styles.head}`}>
                <span>Date</span>
                <span>Slot</span>
                <span>Qty</span>
                <span>Rate</span>
                <span>Amount</span>
              </div>
              {bookings.map((booking) => (
                <div key={booking.id} className={styles.row}>
                  <span>{booking.bookingDate || "-"}</span>
                  <span>{slotsById.get(booking.slotId) || "Slot"}</span>
                  <span>{formatNumber(booking.qtyBooked)}</span>
                  <span>{formatNumber(booking.ratePerWorm)}</span>
                  <span>{formatCurrency(booking.subtotal)}</span>
                </div>
              ))}
            </div>

            <div className={styles.totals}>
              <div className={styles.totalRow}>
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className={styles.totalRow}>
                <span>Tax</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className={`${styles.totalRow} ${styles.final}`}>
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            {business?.bankDetails ? (
              <div className={styles.bankDetails}>
                <p className={styles.label}>Bank Details</p>
                {business.bankDetails.accountName ? <p>Account Name: {business.bankDetails.accountName}</p> : null}
                {business.bankDetails.bankName ? <p>Bank Name: {business.bankDetails.bankName}</p> : null}
                {business.bankDetails.accountNumber ? <p>Account Number: {business.bankDetails.accountNumber}</p> : null}
                {business.bankDetails.ifscCode ? <p>IFSC: {business.bankDetails.ifscCode}</p> : null}
                {business.bankDetails.branch ? <p>Branch: {business.bankDetails.branch}</p> : null}
                {business.bankDetails.upiId ? <p>UPI: {business.bankDetails.upiId}</p> : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function InvoiceViewerPage() {
  return (
    <RequireAuth>
      <InvoiceViewerPageContent />
    </RequireAuth>
  );
}
