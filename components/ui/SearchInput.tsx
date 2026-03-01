"use client";

import styles from "./controls.module.css";

interface SearchInputProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}

export default function SearchInput({ value, onChange, placeholder = "Search" }: SearchInputProps) {
  return (
    <div className={styles.searchWrap}>
      <span className={styles.searchIcon}>⌕</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
