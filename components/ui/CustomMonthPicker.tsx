"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./controls.module.css";

interface CustomMonthPickerProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseMonthValue(value: string) {
  const [yearRaw, monthRaw] = value.split("-");
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;

  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    const now = new Date();
    return { year: now.getFullYear(), monthIndex: now.getMonth() };
  }

  return { year, monthIndex };
}

function toMonthValue(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function displayValue(value: string, placeholder: string) {
  const { year, monthIndex } = parseMonthValue(value);
  if (!value || value.length < 7) return placeholder;
  return `${MONTHS[monthIndex]} ${year}`;
}

export default function CustomMonthPicker({ value, onChange, placeholder = "Select month" }: CustomMonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => parseMonthValue(value).year);
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

  useEffect(() => {
    const parsed = parseMonthValue(value);
    setYear(parsed.year);
  }, [value]);

  const selected = useMemo(() => parseMonthValue(value), [value]);

  return (
    <div className={styles.controlWrap} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        onMouseDown={(event) => {
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
      >
        <span>{displayValue(value, placeholder)}</span>
        <span className={styles.chevron}>{open ? "▲" : "▼"}</span>
      </button>

      {open ? (
        <div className={styles.dropdownModal}>
          <div className={styles.pickerHeader}>
            <button type="button" className={styles.navButton} onClick={() => setYear((prev) => prev - 1)}>
              ←
            </button>
            <p className={styles.monthYear}>{year}</p>
            <button type="button" className={styles.navButton} onClick={() => setYear((prev) => prev + 1)}>
              →
            </button>
          </div>

          <div className={styles.list}>
            {MONTHS.map((monthLabel, monthIndex) => {
              const monthValue = toMonthValue(year, monthIndex);
              const selectedClass = selected.year === year && selected.monthIndex === monthIndex ? styles.optionSelected : "";
              return (
                <button
                  key={monthValue}
                  type="button"
                  className={`${styles.option} ${selectedClass}`}
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    onChange(monthValue);
                    setOpen(false);
                  }}
                >
                  {monthLabel}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
