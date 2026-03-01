"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SearchInput from "@/components/ui/SearchInput";
import CustomDropdown, { type DropdownOption } from "@/components/ui/CustomDropdown";
import { useAuth } from "@/components/AuthProvider";
import {
  createFarmer,
  deleteFarmer,
  listFarmersByBusiness,
  updateFarmer,
  type FarmerRecord,
  type FarmerStatus
} from "@/lib/firebase/farmers";
import styles from "./farmers.module.css";

const statusOptions: DropdownOption[] = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" }
];

function statusClass(status: FarmerStatus) {
  return status === "inactive" ? styles.statusInactive : styles.statusActive;
}

export default function FarmersPage() {
  const { profile } = useAuth();

  const [farmers, setFarmers] = useState<FarmerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Loading...");

  const [showForm, setShowForm] = useState(false);
  const [searchText, setSearchText] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [village, setVillage] = useState("");
  const [address, setAddress] = useState("");
  const [farmerStatus, setFarmerStatus] = useState<FarmerStatus>("active");
  const [notes, setNotes] = useState("");

  const [editingFarmer, setEditingFarmer] = useState<FarmerRecord | null>(null);
  const [deletingFarmer, setDeletingFarmer] = useState<FarmerRecord | null>(null);

  const refreshFarmers = useCallback(async () => {
    if (!profile?.businessId) return;

    setLoading(true);
    try {
      const rows = await listFarmersByBusiness(profile.businessId);
      setFarmers(rows);
      setStatus(rows.length ? "" : "No farmers yet. Add your first farmer.");
    } catch {
      setStatus("Could not load farmers. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }, [profile?.businessId]);

  useEffect(() => {
    void refreshFarmers();
  }, [refreshFarmers]);

  const resetForm = () => {
    setName("");
    setPhone("");
    setAltPhone("");
    setVillage("");
    setAddress("");
    setFarmerStatus("active");
    setNotes("");
  };

  const isValid = () => {
    if (!name.trim()) {
      setStatus("Farmer name is required.");
      return false;
    }

    return true;
  };

  const handleCreateFarmer = async () => {
    if (!profile?.businessId || !isValid()) return;

    try {
      await createFarmer({
        businessId: profile.businessId,
        name,
        phone,
        altPhone,
        village,
        address,
        status: farmerStatus,
        notes
      });

      setStatus("Farmer added.");
      setShowForm(false);
      resetForm();
      await refreshFarmers();
    } catch {
      setStatus("Could not save farmer. Please try again.");
    }
  };

  const openEditModal = (farmer: FarmerRecord) => {
    setEditingFarmer(farmer);
    setName(farmer.name);
    setPhone(farmer.phone);
    setAltPhone(farmer.altPhone || "");
    setVillage(farmer.village);
    setAddress(farmer.address || "");
    setFarmerStatus(farmer.status);
    setNotes(farmer.notes || "");
  };

  const handleUpdateFarmer = async () => {
    if (!profile?.businessId || !editingFarmer || !isValid()) return;

    try {
      await updateFarmer({
        businessId: profile.businessId,
        farmerId: editingFarmer.id,
        name,
        phone,
        altPhone,
        village,
        address,
        status: farmerStatus,
        notes
      });

      setStatus("Farmer updated.");
      setEditingFarmer(null);
      resetForm();
      await refreshFarmers();
    } catch {
      setStatus("Could not update farmer. Please try again.");
    }
  };

  const handleDeleteFarmer = async () => {
    if (!profile?.businessId || !deletingFarmer) return;

    try {
      await deleteFarmer(profile.businessId, deletingFarmer.id);
      setStatus("Farmer deleted.");
      setDeletingFarmer(null);
      await refreshFarmers();
    } catch {
      setStatus("Could not delete farmer. Please try again.");
    }
  };

  const filteredFarmers = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return farmers;

    return farmers.filter((farmer) => {
      return (
        farmer.name.toLowerCase().includes(query) ||
        farmer.phone.toLowerCase().includes(query) ||
        farmer.altPhone.toLowerCase().includes(query) ||
        farmer.village.toLowerCase().includes(query) ||
        farmer.address.toLowerCase().includes(query) ||
        farmer.status.toLowerCase().includes(query)
      );
    });
  }, [farmers, searchText]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Farmers</p>
          <h1>Farmer Master</h1>
          <p className={styles.lead}>Manage farmer profiles with contact, village, and address details.</p>
        </div>
        <button
          className={styles.primaryCta}
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          Add Farmer
        </button>
      </header>

      <section className={styles.list}>
        <div className={styles.listHeader}>
          <h2>Farmers</h2>
          {loading ? <span>Loading...</span> : null}
        </div>

        <div className={styles.searchBar}>
          <SearchInput
            value={searchText}
            onChange={setSearchText}
            placeholder="Search by name, phone, village, address, or status"
          />
        </div>

        {status && !loading ? (
          <p className={status.includes("Could not") ? styles.error : styles.message}>{status}</p>
        ) : null}

        {!loading && filteredFarmers.length === 0 ? <p className={styles.empty}>No farmers available.</p> : null}

        {filteredFarmers.length > 0 ? (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Alt Phone</th>
                  <th>Village</th>
                  <th>Address</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFarmers.map((farmer) => (
                  <tr key={farmer.id}>
                    <td className={styles.name} data-label="Name">
                      {farmer.name}
                    </td>
                    <td data-label="Phone">{farmer.phone || "-"}</td>
                    <td data-label="Alt Phone">{farmer.altPhone || "-"}</td>
                    <td data-label="Village">{farmer.village || "-"}</td>
                    <td data-label="Address">{farmer.address || "-"}</td>
                    <td data-label="Status">
                      <span className={`${styles.statusPill} ${statusClass(farmer.status)}`}>{farmer.status}</span>
                    </td>
                    <td data-label="Actions" className={styles.rowActions}>
                      <div className={styles.inlineActions}>
                        <button
                          type="button"
                          className={styles.editBtn}
                          onClick={() => openEditModal(farmer)}
                          aria-label={`Edit ${farmer.name}`}
                          title="Edit"
                        >
                          <span className={styles.editIcon}>✎</span>
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={() => setDeletingFarmer(farmer)}
                          aria-label={`Delete ${farmer.name}`}
                          title="Delete"
                        >
                          ✕
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
              <h2>Add Farmer</h2>
              <button type="button" className={styles.closeBtn} onClick={() => setShowForm(false)}>
                ✕
              </button>
            </div>

            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                void handleCreateFarmer();
              }}
            >
              <label className={styles.field}>
                Name
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Farmer name" required />
              </label>

              <label className={styles.field}>
                Phone
                <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91XXXXXXXXXX" />
              </label>

              <label className={styles.field}>
                Alt Phone
                <input value={altPhone} onChange={(event) => setAltPhone(event.target.value)} placeholder="Optional" />
              </label>

              <label className={styles.field}>
                Village
                <input value={village} onChange={(event) => setVillage(event.target.value)} placeholder="Village" />
              </label>

              <label className={styles.field}>
                Address
                <textarea value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Address" />
              </label>

              <label className={styles.field}>
                Status
                <CustomDropdown options={statusOptions} value={farmerStatus} onChange={(next) => setFarmerStatus(next as FarmerStatus)} />
              </label>

              <label className={styles.field}>
                Notes
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional notes" />
              </label>

              <div className={styles.actions}>
                <button type="button" className={styles.secondaryBtn} onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit">Save Farmer</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editingFarmer ? (
        <div className={styles.modalOverlay} onClick={() => setEditingFarmer(null)}>
          <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Edit Farmer</h2>
              <button type="button" className={styles.closeBtn} onClick={() => setEditingFarmer(null)}>
                ✕
              </button>
            </div>

            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                void handleUpdateFarmer();
              }}
            >
              <label className={styles.field}>
                Name
                <input value={name} onChange={(event) => setName(event.target.value)} required />
              </label>

              <label className={styles.field}>
                Phone
                <input value={phone} onChange={(event) => setPhone(event.target.value)} />
              </label>

              <label className={styles.field}>
                Alt Phone
                <input value={altPhone} onChange={(event) => setAltPhone(event.target.value)} />
              </label>

              <label className={styles.field}>
                Village
                <input value={village} onChange={(event) => setVillage(event.target.value)} />
              </label>

              <label className={styles.field}>
                Address
                <textarea value={address} onChange={(event) => setAddress(event.target.value)} />
              </label>

              <label className={styles.field}>
                Status
                <CustomDropdown options={statusOptions} value={farmerStatus} onChange={(next) => setFarmerStatus(next as FarmerStatus)} />
              </label>

              <label className={styles.field}>
                Notes
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
              </label>

              <p className={styles.hint}>Keep phone and village updated for billing and dispatch coordination.</p>

              <div className={styles.actions}>
                <button type="button" className={styles.secondaryBtn} onClick={() => setEditingFarmer(null)}>
                  Cancel
                </button>
                <button type="submit">Update Farmer</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deletingFarmer ? (
        <div className={styles.modalOverlay} onClick={() => setDeletingFarmer(null)}>
          <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Delete Farmer</h2>
              <button type="button" className={styles.closeBtn} onClick={() => setDeletingFarmer(null)}>
                ✕
              </button>
            </div>
            <p className={styles.hint}>
              Delete <strong>{deletingFarmer.name}</strong>? This action cannot be undone.
            </p>
            <div className={styles.actions}>
              <button type="button" className={styles.secondaryBtn} onClick={() => setDeletingFarmer(null)}>
                Cancel
              </button>
              <button type="button" className={styles.deletePrimaryBtn} onClick={() => void handleDeleteFarmer()}>
                Delete Farmer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
