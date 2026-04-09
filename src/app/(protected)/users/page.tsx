"use client";

import { FormEvent, useEffect, useState } from "react";
import { ApiError } from "@/lib/auth-api";
import { getAuthToken } from "@/lib/auth-session";
import { createUser, deleteUser, listUsers, updateUser, type UserRecord } from "@/lib/crud-api";

const roleOptions = ["admin", "staff", "Technician"] as const;
const EMAIL_DOMAIN = "@rpg.com";

type UserFormState = {
  name: string;
  email: string;
  role: string;
  password: string;
  password_confirmation: string;
};

const initialForm: UserFormState = {
  name: "",
  email: "",
  role: roleOptions[0],
  password: "",
  password_confirmation: "",
};

function getEmailLocalPart(value: string): string {
  const noSpaces = value.replace(/\s+/g, "");
  return noSpaces.split("@")[0] ?? "";
}

function buildRpgEmail(value: string): string {
  const localPart = getEmailLocalPart(value);
  return localPart ? `${localPart}${EMAIL_DOMAIN}` : "";
}

export default function UsersPage() {
  const [records, setRecords] = useState<UserRecord[]>([]);
  const [form, setForm] = useState<UserFormState>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  async function loadUsers(nextPage = page) {
    const token = getAuthToken();
    if (!token) {
      setError("You are not authenticated. Please sign in again.");
      setIsLoading(false);
      return;
    }

    setError("");
    try {
      const response = await listUsers(token, nextPage);
      setRecords(response.items);
      setPage(response.currentPage);
      setLastPage(response.lastPage);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to load users at the moment.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAuthToken();
    if (!token) {
      setError("You are not authenticated. Please sign in again.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");
    try {
      if (editingId) {
        await updateUser(token, editingId, {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          ...(form.password
            ? {
                password: form.password,
                password_confirmation: form.password_confirmation,
              }
            : {}),
        });
        setMessage("User updated successfully.");
      } else {
        await createUser(token, {
          name: form.name.trim(),
          email: buildRpgEmail(form.email),
          role: form.role,
          password: form.password,
          password_confirmation: form.password_confirmation,
        });
        setMessage("User created successfully.");
      }
      resetForm();
      await loadUsers(page);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to save this user right now.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onDelete(id: number) {
    const token = getAuthToken();
    if (!token) {
      setError("You are not authenticated. Please sign in again.");
      return;
    }

    if (!window.confirm("Delete this user permanently?")) return;

    setError("");
    setMessage("");
    try {
      await deleteUser(token, id);
      setMessage("User deleted successfully.");
      await loadUsers(page);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to delete this user right now.");
      }
    }
  }

  function onEdit(record: UserRecord) {
    setEditingId(record.id);
    setForm({
      name: record.name,
      email: record.email,
      role: roleOptions.includes(record.role as (typeof roleOptions)[number]) ? record.role : roleOptions[0],
      password: "",
      password_confirmation: "",
    });
    setMessage("");
    setError("");
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-on-surface">Users</h1>
        <p className="text-on-surface-variant">
          Full CRUD connected to `/users` endpoint with create, list, edit, and delete actions.
        </p>
      </div>

      <form className="glass ghost-border space-y-4 rounded-md border p-4" onSubmit={onSubmit}>
        <h2 className="text-lg font-semibold text-on-surface">{editingId ? "Edit User" : "Create User"}</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm text-on-surface">
            <span className="font-medium">Name</span>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
              className="w-full rounded-md border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 outline-none focus:border-primary"
              placeholder="User full name"
            />
          </label>

          <label className="space-y-1 text-sm text-on-surface">
            <span className="font-medium">Email</span>
            {editingId ? (
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                required
                className="w-full rounded-md border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 outline-none focus:border-primary"
                placeholder={`user${EMAIL_DOMAIN}`}
              />
            ) : (
              <div className="flex overflow-hidden rounded-md border border-outline-variant/40 bg-surface-container-lowest focus-within:border-primary">
                <input
                  type="text"
                  value={getEmailLocalPart(form.email)}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, email: buildRpgEmail(event.target.value) }))
                  }
                  required
                  className="min-w-0 flex-1 px-3 py-2 outline-none"
                  placeholder="username"
                />
                <span className="border-l border-outline-variant/30 bg-surface-container-low px-3 py-2 text-on-surface-variant">
                  {EMAIL_DOMAIN}
                </span>
              </div>
            )}
          </label>

          <label className="space-y-1 text-sm text-on-surface">
            <span className="font-medium">Role</span>
            <select
              value={form.role}
              onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
              className="w-full rounded-md border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 outline-none focus:border-primary"
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm text-on-surface">
            <span className="font-medium">{editingId ? "New Password (optional)" : "Password"}</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              required={!editingId}
              className="w-full rounded-md border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 outline-none focus:border-primary"
              placeholder="••••••••"
            />
          </label>

          <label className="space-y-1 text-sm text-on-surface md:col-span-2">
            <span className="font-medium">{editingId ? "Confirm New Password" : "Confirm Password"}</span>
            <input
              type="password"
              value={form.password_confirmation}
              onChange={(event) => setForm((prev) => ({ ...prev, password_confirmation: event.target.value }))}
              required={!editingId || Boolean(form.password)}
              className="w-full rounded-md border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 outline-none focus:border-primary"
              placeholder="••••••••"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : editingId ? "Update User" : "Create User"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-outline-variant/40 bg-surface-container-low px-4 py-2 text-sm font-semibold text-on-surface"
            >
              Cancel Edit
            </button>
          ) : null}
        </div>
      </form>

      {error ? <p className="rounded-md bg-error-container px-3 py-2 text-sm text-on-error-container">{error}</p> : null}
      {message ? (
        <p className="rounded-md bg-primary-container px-3 py-2 text-sm text-on-primary-container">{message}</p>
      ) : null}

      <div className="glass ghost-border rounded-md border">
        <div className="border-b border-outline-variant/20 px-4 py-3">
          <h2 className="text-lg font-semibold text-on-surface">Users List</h2>
        </div>

        {isLoading ? (
          <p className="p-4 text-sm text-on-surface-variant">Loading users...</p>
        ) : records.length === 0 ? (
          <p className="p-4 text-sm text-on-surface-variant">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-surface-container-low text-on-surface">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-t border-outline-variant/20 text-on-surface">
                    <td className="px-4 py-3">{record.name}</td>
                    <td className="px-4 py-3">{record.email}</td>
                    <td className="px-4 py-3">{record.role}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(record)}
                          className="rounded-md border border-outline-variant/40 bg-surface-container-low px-3 py-1 font-medium text-on-surface"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(record.id)}
                          className="rounded-md bg-error-container px-3 py-1 font-medium text-on-error-container"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-outline-variant/20 px-4 py-3 text-sm">
          <p className="text-on-surface-variant">
            Page {page} of {lastPage}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => loadUsers(page - 1)}
              className="rounded-md border border-outline-variant/40 bg-surface-container-low px-3 py-1 text-on-surface disabled:cursor-not-allowed disabled:opacity-60"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= lastPage}
              onClick={() => loadUsers(page + 1)}
              className="rounded-md border border-outline-variant/40 bg-surface-container-low px-3 py-1 text-on-surface disabled:cursor-not-allowed disabled:opacity-60"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
