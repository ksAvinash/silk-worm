"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./controls.module.css";

interface CustomDatePickerProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function toDate(value: string) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toIsoDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function displayDate(value: string, fallback: string) {
  const date = toDate(value);
  if (!date) return fallback;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export default function CustomDatePicker({ value, onChange, placeholder = "Select date" }: CustomDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(() => toDate(value) || new Date());
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleOutside);
      return () => document.removeEventListener("mousedown", handleOutside);
    }
  }, [open]);

  const selectedValue = value;
  const days = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const total = end.getDate();
    const firstWeekDay = start.getDay();

    const data: Array<{ day: number; date: string } | null> = [];
    for (let i = 0; i < firstWeekDay; i += 1) data.push(null);

    for (let day = 1; day <= total; day += 1) {
      const d = new Date(month.getFullYear(), month.getMonth(), day);
      data.push({ day, date: toIsoDate(d) });
    }

    return data;
  }, [month]);

  return (
    <div className={styles.controlWrap} ref={ref}>
      <button type="button" className={styles.trigger} onClick={() => setOpen((prev) => !prev)}>
        <span>{displayDate(value, placeholder)}</span>
        <span className={styles.chevron}>{open ? "▲" : "▼"}</span>
      </button>

      {open ? (
        <div className={styles.picker}>
          <div className={styles.pickerHeader}>
            <button
              type="button"
              className={styles.navButton}
              onClick={() => setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            >
              ←
            </button>
            <p className={styles.monthYear}>
              {month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </p>
            <button
              type="button"
              className={styles.navButton}
              onClick={() => setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            >
              →
            </button>
          </div>

          <div className={styles.weekDays}>
            {WEEK_DAYS.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className={styles.calendar}>
            {days.map((cell, idx) =>
              cell ? (
                <button
                  key={cell.date}
                  type="button"
                  className={`${styles.day} ${selectedValue === cell.date ? styles.daySelected : ""}`}
                  onClick={() => {
                    onChange(cell.date);
                    setOpen(false);
                  }}
                >
                  {cell.day}
                </button>
              ) : (
                <div key={`empty-${idx}`} className={styles.emptyDay} />
              )
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
