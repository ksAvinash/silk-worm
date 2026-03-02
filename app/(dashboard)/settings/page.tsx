"use client";

import { useEffect, useMemo, useState } from "react";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useAuth } from "@/components/AuthProvider";
import CustomDropdown, { type DropdownOption } from "@/components/ui/CustomDropdown";
import { getTeamUserById, type ModulePermissions, type PermissionLevel } from "@/lib/firebase/users";
import { updateBusinessSettings, updateBusinessLogo } from "@/lib/firebase/tenant";
import { storage } from "@/lib/firebase/config";
import styles from "./settings.module.css";

const EMPTY_PERMISSIONS: ModulePermissions = {
  slots: "none",
  farmers: "none",
  bookings: "none",
  invoices: "none",
  reports: "none",
  users: "none",
  settings: "none"
};

const LANGUAGE_OPTIONS: DropdownOption[] = [
  { value: "en-IN", label: "English" },
  { value: "hi-IN", label: "Hindi" },
  { value: "kn-IN", label: "Kannada" },
  { value: "te-IN", label: "Telugu" },
  { value: "ta-IN", label: "Tamil" }
];

interface SettingsFormState {
  businessName: string;
  invoicePrefix: string;
  slotFrequencyDays: string;
  logoUrl: string;
  language: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  upiId: string;
}

function hasRead(level: PermissionLevel) {
  return level === "read" || level === "edit";
}

function hasEdit(level: PermissionLevel) {
  return level === "edit";
}

function buildInitialForm(): SettingsFormState {
  return {
    businessName: "",
    invoicePrefix: "",
    slotFrequencyDays: "7",
    logoUrl: "",
    language: "en-IN",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    country: "",
    accountName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    branch: "",
    upiId: ""
  };
}

export default function SettingsPage() {
  const { profile, business } = useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Loading settings...");
  const [permissions, setPermissions] = useState<ModulePermissions>(EMPTY_PERMISSIONS);
  const [form, setForm] = useState<SettingsFormState>(buildInitialForm());
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!profile?.businessId || !profile?.uid) return;

      setLoading(true);
      setStatus("");

      if (profile.role === "owner") {
        setPermissions({
          slots: "edit",
          farmers: "edit",
          bookings: "edit",
          invoices: "edit",
          reports: "edit",
          users: "edit",
          settings: "edit"
        });
        setLoading(false);
        return;
      }

      try {
        const me = await getTeamUserById(profile.businessId, profile.uid);
        if (!me) {
          setStatus("Could not find your user profile in this business.");
          setPermissions(EMPTY_PERMISSIONS);
          return;
        }
        setPermissions({ ...EMPTY_PERMISSIONS, ...me.permissions });
      } catch {
        setStatus("Could not load settings permissions right now.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [profile?.businessId, profile?.role, profile?.uid]);

  const canViewSettings = useMemo(() => {
    if (profile?.role === "owner") return true;
    return hasRead((permissions.settings || "none") as PermissionLevel);
  }, [permissions.settings, profile?.role]);

  const canEditSettings = useMemo(() => {
    if (profile?.role === "owner") return true;
    return hasEdit((permissions.settings || "none") as PermissionLevel);
  }, [permissions.settings, profile?.role]);

  useEffect(() => {
    setForm({
      businessName: business?.name || "",
      invoicePrefix: business?.invoicePrefix || "",
      slotFrequencyDays: String(business?.slotFrequencyDays || 7),
      logoUrl: business?.logoUrl || "",
      language: business?.language || "en-IN",
      addressLine1: business?.address?.line1 || "",
      addressLine2: business?.address?.line2 || "",
      city: business?.address?.city || "",
      state: business?.address?.state || "",
      pincode: business?.address?.pincode || "",
      country: business?.address?.country || "",
      accountName: business?.bankDetails?.accountName || "",
      bankName: business?.bankDetails?.bankName || "",
      accountNumber: business?.bankDetails?.accountNumber || "",
      ifscCode: business?.bankDetails?.ifscCode || "",
      branch: business?.bankDetails?.branch || "",
      upiId: business?.bankDetails?.upiId || ""
    });
    if (business) {
      setStatus("");
    }
  }, [business]);

  const onFieldChange = (key: keyof SettingsFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.businessId || !canEditSettings) return;

    if (file.type !== "image/png") {
      setStatus("Please upload logo in PNG format only.");
      return;
    }

    const maxBytes = 4 * 1024 * 1024;
    if (file.size > maxBytes) {
      setStatus("Logo image must be under 4MB.");
      return;
    }

    setUploadingLogo(true);
    setStatus("Uploading logo...");

    try {
      const objectRef = ref(storage, `businesses/${profile.businessId}/company-logo.png`);

      await uploadBytes(objectRef, file, { contentType: file.type });
      const url = await getDownloadURL(objectRef);

      await updateBusinessLogo(profile.businessId, url);
      setForm((prev) => ({ ...prev, logoUrl: url }));
      setStatus("Logo uploaded successfully.");
    } catch {
      setStatus("Could not upload logo right now.");
    } finally {
      setUploadingLogo(false);
      event.target.value = "";
    }
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile?.businessId || !canEditSettings) return;

    if (!form.businessName.trim()) {
      setStatus("Business name is required.");
      return;
    }

    if (!form.invoicePrefix.trim()) {
      setStatus("Invoice prefix is required.");
      return;
    }

    setSaving(true);
    setStatus("");
    try {
      await updateBusinessSettings(profile.businessId, {
        name: form.businessName.trim(),
        invoicePrefix: form.invoicePrefix.trim().toUpperCase(),
        slotFrequencyDays: Number(form.slotFrequencyDays || 0),
        logoUrl: form.logoUrl.trim(),
        language: form.language,
        address: {
          line1: form.addressLine1.trim(),
          line2: form.addressLine2.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
          country: form.country.trim()
        },
        bankDetails: {
          accountName: form.accountName.trim(),
          bankName: form.bankName.trim(),
          accountNumber: form.accountNumber.trim(),
          ifscCode: form.ifscCode.trim().toUpperCase(),
          branch: form.branch.trim(),
          upiId: form.upiId.trim()
        }
      });
      setStatus("Settings updated successfully.");
    } catch {
      setStatus("Could not update settings right now.");
    } finally {
      setSaving(false);
    }
  };

  if (!loading && !canViewSettings) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Settings</p>
            <h1>Settings</h1>
          </div>
        </header>
        <div className={styles.notice}>You don’t have permission to access settings.</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Settings</p>
          <h1>Business Settings</h1>
          <p className={styles.lead}>Update business details, bank details, address, logo, and language preferences.</p>
        </div>
      </header>

      {status ? <div className={styles.notice}>{status}</div> : null}

      <form className={styles.form} onSubmit={handleSave}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3>Business Details</h3>
          </div>

          <div className={styles.formGrid}>
            <label className={styles.field}>
              Business Name
              <input value={form.businessName} onChange={(e) => onFieldChange("businessName", e.target.value)} disabled={!canEditSettings || loading} />
            </label>

            <label className={styles.field}>
              Invoice Prefix
              <input value={form.invoicePrefix} onChange={(e) => onFieldChange("invoicePrefix", e.target.value)} disabled={!canEditSettings || loading} />
            </label>

            <label className={styles.field}>
              Slot Frequency (Days)
              <input
                type="number"
                min={1}
                value={form.slotFrequencyDays}
                onChange={(e) => onFieldChange("slotFrequencyDays", e.target.value)}
                disabled={!canEditSettings || loading}
              />
            </label>

            <label className={styles.field}>
              Upload Company Logo
              <input
                type="file"
                accept="image/png"
                onChange={handleLogoUpload}
                disabled={!canEditSettings || loading || uploadingLogo}
              />
            </label>

            <label className={styles.field}>
              Language
              <CustomDropdown
                options={LANGUAGE_OPTIONS}
                value={form.language}
                onChange={(next) => onFieldChange("language", next)}
                placeholder="Select language"
                searchable={false}
                disabled={!canEditSettings || loading}
              />
            </label>
          </div>

          {form.logoUrl ? (
            <div className={styles.logoPreviewWrap}>
              <p>Logo Preview</p>
              <img src={`${form.logoUrl}?t=${Date.now()}`} alt="Company logo" className={styles.logoPreview} />
            </div>
          ) : null}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3>Address</h3>
          </div>

          <div className={styles.formGrid}>
            <label className={styles.field}>
              Address Line 1
              <input value={form.addressLine1} onChange={(e) => onFieldChange("addressLine1", e.target.value)} disabled={!canEditSettings || loading} />
            </label>
            <label className={styles.field}>
              Address Line 2
              <input value={form.addressLine2} onChange={(e) => onFieldChange("addressLine2", e.target.value)} disabled={!canEditSettings || loading} />
            </label>
            <label className={styles.field}>
              City
              <input value={form.city} onChange={(e) => onFieldChange("city", e.target.value)} disabled={!canEditSettings || loading} />
            </label>
            <label className={styles.field}>
              State
              <input value={form.state} onChange={(e) => onFieldChange("state", e.target.value)} disabled={!canEditSettings || loading} />
            </label>
            <label className={styles.field}>
              Pincode
              <input value={form.pincode} onChange={(e) => onFieldChange("pincode", e.target.value)} disabled={!canEditSettings || loading} />
            </label>
            <label className={styles.field}>
              Country
              <input value={form.country} onChange={(e) => onFieldChange("country", e.target.value)} disabled={!canEditSettings || loading} />
            </label>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3>Bank Details</h3>
          </div>

          <div className={styles.formGrid}>
            <label className={styles.field}>
              Account Name
              <input value={form.accountName} onChange={(e) => onFieldChange("accountName", e.target.value)} disabled={!canEditSettings || loading} />
            </label>
            <label className={styles.field}>
              Bank Name
              <input value={form.bankName} onChange={(e) => onFieldChange("bankName", e.target.value)} disabled={!canEditSettings || loading} />
            </label>
            <label className={styles.field}>
              Account Number
              <input value={form.accountNumber} onChange={(e) => onFieldChange("accountNumber", e.target.value)} disabled={!canEditSettings || loading} />
            </label>
            <label className={styles.field}>
              IFSC Code
              <input value={form.ifscCode} onChange={(e) => onFieldChange("ifscCode", e.target.value)} disabled={!canEditSettings || loading} />
            </label>
            <label className={styles.field}>
              Branch
              <input value={form.branch} onChange={(e) => onFieldChange("branch", e.target.value)} disabled={!canEditSettings || loading} />
            </label>
            <label className={styles.field}>
              UPI ID
              <input value={form.upiId} onChange={(e) => onFieldChange("upiId", e.target.value)} disabled={!canEditSettings || loading} />
            </label>
          </div>
        </section>

        <div className={styles.formActions}>
          {!canEditSettings ? <p className={styles.readOnly}>Read-only access. Ask an admin for edit permission.</p> : null}
          <button type="submit" className={styles.saveBtn} disabled={!canEditSettings || loading || saving}>
            {saving ? "Saving..." : uploadingLogo ? "Uploading Logo..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
