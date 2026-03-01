"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./controls.module.css";

export interface DropdownOption {
  label: string;
  value: string;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
}

function normalizeText(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export default function CustomDropdown({
  options,
  value,
  onChange,
  placeholder = "Select option",
  searchable = false,
  searchPlaceholder = "Search"
}: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", onDocClick);
      return () => document.removeEventListener("mousedown", onDocClick);
    }
  }, [open]);

  const selectedLabel = useMemo(() => {
    const hit = options.find((item) => item.value === value);
    return hit?.label || placeholder;
  }, [options, placeholder, value]);

  const filtered = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return options;
    const compact = normalizeText(searchText);

    return options.filter((item) => {
      const plain = item.label.toLowerCase();
      return plain.includes(query) || normalizeText(plain).includes(compact);
    });
  }, [options, searchText]);

  const handleSelect = (next: string) => {
    onChange(next);
    setOpen(false);
    setSearchText("");
  };

  return (
    <div className={styles.controlWrap} ref={ref}>
      <button type="button" className={styles.trigger} onClick={() => setOpen((prev) => !prev)}>
        <span>{selectedLabel}</span>
        <span className={styles.chevron}>{open ? "▲" : "▼"}</span>
      </button>

      {open ? (
        <div className={styles.dropdownModal}>
          {searchable ? (
            <input
              className={styles.searchInput}
              placeholder={searchPlaceholder}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              autoFocus
            />
          ) : null}

          <div className={styles.list}>
            {filtered.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`${styles.option} ${item.value === value ? styles.optionSelected : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(item.value);
                }}
              >
                {item.label}
              </button>
            ))}

            {!filtered.length ? <div className={styles.emptyState}>No options found</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
