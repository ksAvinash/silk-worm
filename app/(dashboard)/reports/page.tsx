"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import CustomMonthPicker from "@/components/ui/CustomMonthPicker";
import { getReportsPayload, type ReportsPayload } from "@/lib/firebase/reports";
import styles from "./reports.module.css";

function getMonthValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return "Rs 0";
  return `Rs ${Math.round(value).toLocaleString("en-IN")}`;
}

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString("en-IN");
}

export default function ReportsPage() {
  const { profile } = useAuth();
  const [month, setMonth] = useState(getMonthValue());
  const [report, setReport] = useState<ReportsPayload | null>(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile?.businessId || !month) return;

    const load = async () => {
      setStatus("loading");
      setError("");
      try {
        const data = await getReportsPayload(profile.businessId, month);
        setReport(data);
        setStatus("success");
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Unable to load reports data.");
      }
    };

    void load();
  }, [month, profile?.businessId]);

  const chartScale = useMemo(() => {
    const max = Math.max(...(report?.dailyTrend.map((item) => item.value) || [0]));
    return max > 0 ? max : 1;
  }, [report?.dailyTrend]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Reports</p>
          <h1>Business Insights</h1>
          <p className={styles.lead}>Review monthly revenue, farmer performance, and slot utilization trends.</p>
        </div>

        <label className={styles.monthField}>
          Month
          <CustomMonthPicker value={month} onChange={setMonth} placeholder="Select report month" />
        </label>
      </header>

      {status === "error" ? <div className={`${styles.notice} ${styles.error}`}>{error}</div> : null}

      <section className={styles.stats}>
        <article className={styles.card}>
          <p>Total Revenue</p>
          <h2>{formatCurrency(report?.summary.totalRevenue || 0)}</h2>
          <span>{formatNumber(report?.summary.totalBookings || 0)} bookings</span>
        </article>

        <article className={styles.card}>
          <p>Average per Day</p>
          <h2>{formatCurrency(report?.summary.averagePerDay || 0)}</h2>
          <span>Projected {formatCurrency(report?.summary.projectedRevenue || 0)}</span>
        </article>

        <article className={styles.card}>
          <p>Invoices Raised</p>
          <h2>{formatCurrency(report?.summary.invoicesRaised || 0)}</h2>
          <span>Pending {formatCurrency(report?.summary.pendingDue || 0)}</span>
        </article>

        <article className={styles.card}>
          <p>Collected Amount</p>
          <h2>{formatCurrency(report?.summary.amountCollected || 0)}</h2>
          <span>From payments this month</span>
        </article>

        <article className={styles.card}>
          <p>Active Slots</p>
          <h2>{formatNumber(report?.summary.activeSlots || 0)}</h2>
          <span>Currently open</span>
        </article>
      </section>

      <section className={styles.grid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3>Daily Revenue Trend</h3>
            {status === "loading" ? <span>Loading...</span> : null}
          </div>

          {!report?.dailyTrend?.length ? (
            <p className={styles.empty}>No daily data available.</p>
          ) : (
            <div className={styles.chartWrap}>
              <div className={styles.chartBars}>
                {report.dailyTrend.map((item) => {
                  const heightPercent = Math.max(2, Math.round((item.value / chartScale) * 100));
                  return (
                    <div key={item.day} className={styles.barCol}>
                      <span className={styles.bar} style={{ height: `${heightPercent}%` }} title={`Day ${item.day}: ${formatCurrency(item.value)}`} />
                      <span className={styles.barDay}>{item.day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3>Top Farmers</h3>
          </div>

          {!report?.farmerBreakdown?.length ? (
            <p className={styles.empty}>No farmer stats for this month.</p>
          ) : (
            <div className={`${styles.table} ${styles.table4}`}>
              <div className={styles.tableHeader}>
                <span>Farmer</span>
                <span>Orders</span>
                <span>Qty</span>
                <span>Revenue</span>
              </div>

              {report.farmerBreakdown.map((row) => (
                <div key={row.farmerId} className={styles.tableRow}>
                  <span>{row.farmerName}</span>
                  <span>{formatNumber(row.bookings)}</span>
                  <span>{formatNumber(row.quantity)}</span>
                  <span>{formatCurrency(row.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3>Slot Utilization</h3>
          </div>

          {!report?.slotUtilization?.length ? (
            <p className={styles.empty}>No slot utilization data.</p>
          ) : (
            <div className={`${styles.table} ${styles.table5}`}>
              <div className={styles.tableHeader}>
                <span>Slot</span>
                <span>Capacity</span>
                <span>Booked</span>
                <span>Balance</span>
                <span>Utilization</span>
              </div>

              {report.slotUtilization.map((row) => (
                <div key={row.slotId} className={styles.tableRow}>
                  <span>{row.slotName}</span>
                  <span>{formatNumber(row.capacity)}</span>
                  <span>{formatNumber(row.booked)}</span>
                  <span>{formatNumber(row.balance)}</span>
                  <span>
                    {row.utilizationPercent}% <span className={styles.pill}>{row.status}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
