"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import CustomDropdown, { type DropdownOption } from "@/components/ui/CustomDropdown";
import SearchInput from "@/components/ui/SearchInput";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useAuth } from "@/components/AuthProvider";
import {
  createTeamUser,
  listUsersByBusiness,
  removeTeamUser,
  updateTeamUser,
  type ModulePermissions,
  type PermissionLevel,
  type TeamUserRecord
} from "@/lib/firebase/users";
import type { UserRole } from "@/lib/firebase/tenant";
import styles from "./users.module.css";

const ROLE_OPTIONS: DropdownOption[] = [
  { label: "Manager", value: "manager" },
  { label: "Operator", value: "operator" }
];

const PERMISSION_OPTIONS: DropdownOption[] = [
  { label: "None", value: "none" },
  { label: "Read", value: "read" },
  { label: "Edit", value: "edit" }
];

const MODULES = [
  { id: "slots", label: "Slots" },
  { id: "farmers", label: "Farmers" },
  { id: "bookings", label: "Bookings" },
  { id: "invoices", label: "Invoices" },
  { id: "reports", label: "Reports" },
  { id: "users", label: "Users" }
] as const;

const EMPTY_PERMISSIONS: ModulePermissions = {
  slots: "none",
  farmers: "none",
  bookings: "none",
  invoices: "none",
  reports: "none",
  users: "none"
};

interface UserFormState {
  phone: string;
  displayName: string;
  role: UserRole;
  active: boolean;
  notes: string;
  permissions: ModulePermissions;
}

function normalizePhone(phone: string) {
  const raw = phone.replace(/\s+/g, "");
  if (!raw) return "";
  if (raw.startsWith("+")) return raw;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

function isValidPhone(phone: string) {
  return /^\+[1-9]\d{9,14}$/.test(phone);
}

function roleLabel(role: UserRole) {
  if (role === "owner") return "Owner";
  if (role === "manager") return "Manager";
  return "Operator";
}

function getPermissionsSummary(permissions: ModulePermissions) {
  const active = Object.entries(permissions).filter(([, value]) => value !== "none");
  if (!active.length) return "None";
  return active.map(([moduleId, value]) => `${moduleId}: ${value}`).join(", ");
}

function buildInitialForm(): UserFormState {
  return {
    phone: "",
    displayName: "",
    role: "operator",
    active: true,
    notes: "",
    permissions: { ...EMPTY_PERMISSIONS }
  };
}

export default function UsersPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [users, setUsers] = useState<TeamUserRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<TeamUserRecord | null>(null);
  const [form, setForm] = useState<UserFormState>(buildInitialForm());
  const [formError, setFormError] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeamUserRecord | null>(null);

  const loadUsers = useCallback(async () => {
    if (!profile?.businessId) return;
    setLoading(true);
    setError("");

    try {
      const rows = await listUsersByBusiness(profile.businessId);
      setUsers(rows);
    } catch {
      setError("Could not load users right now.");
    } finally {
      setLoading(false);
    }
  }, [profile?.businessId]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return users;
    return users.filter((row) => [row.phone, row.displayName, row.role].join(" ").toLowerCase().includes(query));
  }, [searchTerm, users]);

  const openCreate = () => {
    setEditingUser(null);
    setForm(buildInitialForm());
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (user: TeamUserRecord) => {
    if (user.role === "owner") return;
    setEditingUser(user);
    setForm({
      phone: user.phone,
      displayName: user.displayName,
      role: user.role,
      active: user.active,
      notes: user.notes,
      permissions: { ...EMPTY_PERMISSIONS, ...user.permissions }
    });
    setFormError("");
    setShowForm(true);
  };

  const onFormChange = (field: keyof UserFormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value } as UserFormState));
  };

  const onPermissionChange = (moduleId: keyof ModulePermissions, value: string) => {
    setForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleId]: value as PermissionLevel
      }
    }));
  };

  const validateForm = () => {
    const phone = normalizePhone(form.phone);
    if (!phone) {
      setFormError("Phone number is required.");
      return false;
    }
    if (!isValidPhone(phone)) {
      setFormError("Enter a valid phone number with country code.");
      return false;
    }
    if (!form.displayName.trim()) {
      setFormError("Name is required.");
      return false;
    }
    setForm((prev) => ({ ...prev, phone }));
    return true;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile?.businessId) return;
    if (!validateForm()) return;

    setFormSaving(true);
    setFormError("");

    const payload = {
      role: form.role === "owner" ? "operator" : form.role,
      phone: normalizePhone(form.phone),
      displayName: form.displayName.trim(),
      active: form.active,
      notes: form.notes.trim(),
      permissions: form.permissions
    };

    try {
      if (editingUser) {
        await updateTeamUser({
          userId: editingUser.id,
          ...payload
        });
        setStatus("User updated.");
      } else {
        await createTeamUser({
          businessId: profile.businessId,
          ...payload
        });
        setStatus("User created.");
      }

      setShowForm(false);
      setEditingUser(null);
      await loadUsers();
    } catch {
      setFormError("Could not save user. Please try again.");
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.role === "owner") return;

    try {
      await removeTeamUser(deleteTarget.id);
      setStatus("User deleted.");
      setDeleteTarget(null);
      await loadUsers();
    } catch {
      setStatus("Could not delete user. Please try again.");
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Users</p>
          <h1>Manage Users</h1>
          <p className={styles.lead}>Add team users, assign roles, and control page permissions.</p>
        </div>
        <button className={styles.primaryCta} onClick={openCreate}>
          Add User
        </button>
      </header>

      {error ? <div className={styles.error}>{error}</div> : null}
      {status ? <div className={styles.message}>{status}</div> : null}

      <div className={styles.searchBar}>
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search by name, phone, or role" />
      </div>

      {loading ? (
        <div className={styles.empty}>Loading users...</div>
      ) : filteredUsers.length === 0 ? (
        <div className={styles.empty}>{users.length === 0 ? "No users yet. Add your first user." : "No matching users."}</div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Phone</th>
                <th>Name</th>
                <th>Role</th>
                <th>Permissions</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className={styles.phone} data-label="Phone">
                    {user.phone}
                  </td>
                  <td className={styles.name} data-label="Name">
                    {user.displayName}
                  </td>
                  <td className={styles.role} data-label="Role">
                    {roleLabel(user.role)}
                  </td>
                  <td className={styles.permissions} data-label="Permissions">
                    {getPermissionsSummary(user.permissions)}
                  </td>
                  <td data-label="Status">
                    <span
                      className={`${styles.status} ${
                        user.role === "owner" ? styles.admin : user.active ? styles.active : styles.inactive
                      }`}
                    >
                      {user.role === "owner" ? "Owner" : user.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className={styles.actions} data-label="Actions">
                    {user.role !== "owner" ? (
                      <>
                        <button type="button" className={styles.editBtn} onClick={() => openEdit(user)} title="Edit">
                          <span className={styles.editIcon}>✎</span>
                        </button>
                        <button type="button" className={styles.deleteBtn} onClick={() => setDeleteTarget(user)} title="Delete">
                          ✕
                        </button>
                      </>
                    ) : (
                      <span className={styles.ownerText}>Locked</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm ? (
        <div className={styles.modalOverlay} onClick={() => setShowForm(false)}>
          <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingUser ? "Edit User" : "Add User"}</h2>
              <button type="button" className={styles.closeBtn} onClick={() => setShowForm(false)}>
                ✕
              </button>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              {formError ? <div className={styles.formError}>{formError}</div> : null}

              <div className={styles.formGroup}>
                <label>Phone Number *</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) => onFormChange("phone", event.target.value)}
                  onBlur={(event) => onFormChange("phone", normalizePhone(event.target.value))}
                  placeholder="+919876543210"
                />
              </div>

              <div className={styles.formGroup}>
                <label>User Name *</label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(event) => onFormChange("displayName", event.target.value)}
                  placeholder="Enter user name"
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Role</label>
                  <CustomDropdown
                    options={ROLE_OPTIONS}
                    value={form.role === "owner" ? "operator" : form.role}
                    onChange={(next) => onFormChange("role", next as UserRole)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(event) => onFormChange("active", event.target.checked)}
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Permissions</label>
                <div className={styles.permissionsGrid}>
                  {MODULES.map((module) => (
                    <div key={module.id} className={styles.permissionItem}>
                      <span className={styles.permissionLabel}>{module.label}</span>
                      <CustomDropdown
                        options={PERMISSION_OPTIONS}
                        value={form.permissions[module.id]}
                        onChange={(next) => onPermissionChange(module.id, next)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Notes</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(event) => onFormChange("notes", event.target.value)}
                  placeholder="Additional notes"
                />
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.submitBtn} disabled={formSaving}>
                  {formSaving ? "Saving..." : editingUser ? "Update User" : "Add User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete User"
        message={
          deleteTarget ? `Are you sure you want to delete ${deleteTarget.displayName}? This action cannot be undone.` : ""
        }
        confirmText="Delete User"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
