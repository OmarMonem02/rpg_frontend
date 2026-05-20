"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/components/permission-provider";
import { ApiError } from "@/lib/auth-api";
import { getAuthToken } from "@/lib/auth-session";
import { createUser, deleteUser, listUsers, updateUser, type UserRecord } from "@/lib/crud-api";
import {
  ActionButton,
  DataTableCard,
  EmptyState,
  InlineMessage,
  PageHero,
  PageShell,
  PaginationControls,
  StatusBadge,
  SurfaceCard,
} from "@/components/ops-ui";

const roleOptions = ["admin", "staff", "Technician"] as const;
const EMAIL_DOMAIN = "@rpg.hub";

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

function getPermissionSummary(record: UserRecord): string {
  const permissions = record.permissions;
  if (!permissions) return "No access data";

  const dataPages = Object.values(permissions).filter((actions) =>
    actions.includes("read"),
  ).length;
  const uiPages = Object.values(permissions).filter((actions) =>
    actions.includes("display"),
  ).length;
  const totalActions = Object.values(permissions).reduce(
    (sum, actions) => sum + actions.length,
    0,
  );

  return `${dataPages} data / ${uiPages} UI · ${totalActions} actions`;
}

function getUserInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "U";
}

function getRoleLabel(role: string): string {
  if (!role) return "Unknown";
  return role === "Technician" ? role : `${role[0].toUpperCase()}${role.slice(1)}`;
}

function getRoleChipClass(role: string): string {
  if (role === "admin") return "border-primary/15 bg-primary/10 text-primary";
  if (role === "Technician") return "border-accent/20 bg-accent/10 text-accent";
  return "border-outline-variant/15 bg-surface-container text-on-surface-variant";
}

export default function UsersPage() {
  const router = useRouter();
  const permissions = usePermissions();
  const [records, setRecords] = useState<UserRecord[]>([]);
  const [form, setForm] = useState<UserFormState>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const canCreateUsers = permissions.canCreate("users");
  const canUpdateUsers = permissions.canUpdate("users");
  const canDeleteUsers = permissions.canDelete("users");
  const visibleUsers = records.length;
  const customAccessUsers = records.filter((record) => record.permission_source === "custom").length;
  const currentEditingRecord = editingId ? records.find((record) => record.id === editingId) : null;
  const formHeading = editingId ? "Edit User" : "Create User";
  const formDescription = editingId
    ? "Update profile details or set a fresh password for this account."
    : "Create an internal RPG account with the required role and company email.";

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
    if ((editingId && !canUpdateUsers) || (!editingId && !canCreateUsers)) {
      setError("You do not have permission to save users.");
      return;
    }
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
    if (!canDeleteUsers) {
      setError("You do not have permission to delete users.");
      return;
    }
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
    if (!canUpdateUsers) return;
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

  function renderUserActions(record: UserRecord, align: "start" | "end" = "start") {
    if (!canUpdateUsers && !canDeleteUsers) {
      return (
        <span className="text-xs font-medium text-on-surface-variant">
          Read only
        </span>
      );
    }

    return (
      <div className={`flex flex-wrap gap-2 ${align === "end" ? "justify-end" : ""}`.trim()}>
        {canUpdateUsers ? (
          <ActionButton
            type="button"
            size="sm"
            variant="outline"
            onClick={() => router.push(`/users/permissions/${record.id}`)}
            className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
            title="Manage user permissions and authorizations"
          >
            Manage access
          </ActionButton>
        ) : null}
        {canUpdateUsers ? (
          <ActionButton
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onEdit(record)}
          >
            Edit
          </ActionButton>
        ) : null}
        {canDeleteUsers ? (
          <button
            type="button"
            onClick={() => onDelete(record.id)}
            className="inline-flex items-center justify-center rounded-xl bg-error-container px-3 py-1.5 text-xs font-semibold text-on-error-container transition-all duration-200 active:scale-[0.97]"
          >
            Delete
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <PageShell>
      <PageHero
        eyebrow="Admin"
        title="Users"
        meta={
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-outline-variant/15 bg-surface px-3 py-2">
              <p className="label-caps">Visible</p>
              <p className="mono-data mt-1 text-xl font-bold text-on-surface">
                {isLoading ? "--" : visibleUsers}
              </p>
            </div>
            <div className="rounded-2xl border border-outline-variant/15 bg-surface px-3 py-2">
              <p className="label-caps">Custom</p>
              <p className="mono-data mt-1 text-xl font-bold text-primary">
                {isLoading ? "--" : customAccessUsers}
              </p>
            </div>
            <div className="rounded-2xl border border-outline-variant/15 bg-surface px-3 py-2">
              <p className="label-caps">Pages</p>
              <p className="mono-data mt-1 text-xl font-bold text-on-surface">
                {lastPage}
              </p>
            </div>
          </div>
        }
      />

      {canCreateUsers || editingId ? (
        <SurfaceCard className="overflow-hidden bg-surface-container-lowest p-0 shadow-ambient">
          <div className="border-b border-outline-variant/15 bg-surface-container-low px-4 py-4 md:px-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <StatusBadge tone={editingId ? "primary" : "default"}>
                    {editingId ? "Editing account" : "New account"}
                  </StatusBadge>
                  {currentEditingRecord ? (
                    <span className="mono-data rounded-full border border-outline-variant/15 bg-surface px-3 py-1 text-xs text-on-surface-variant">
                      ID {currentEditingRecord.id}
                    </span>
                  ) : null}
                </div>
                <h2 className="text-2xl font-bold text-on-surface">{formHeading}</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-on-surface-variant">
                  {formDescription}
                </p>
              </div>
              <div className="rounded-2xl border border-outline-variant/15 bg-surface px-3 py-2">
                <p className="label-caps">Email Rule</p>
                <p className="mono-data mt-1 text-sm font-semibold text-primary">{EMAIL_DOMAIN}</p>
              </div>
            </div>
          </div>

          <form className="grid gap-5 p-4 md:p-5 xl:grid-cols-[1fr_20rem]" onSubmit={onSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="label-caps">Name</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                  className="form-input-base"
                  placeholder="User full name"
                />
              </label>

              <label className="space-y-2">
                <span className="label-caps">Email</span>
                {editingId ? (
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                    required
                    className="form-input-base"
                    placeholder={`user${EMAIL_DOMAIN}`}
                  />
                ) : (
                  <div className="flex overflow-hidden rounded-xl border-2 border-outline-variant/25 bg-surface text-on-surface transition-colors hover:border-outline-variant/45 focus-within:border-primary focus-within:bg-surface-container-lowest focus-within:ring-4 focus-within:ring-primary/10">
                    <input
                      type="text"
                      value={getEmailLocalPart(form.email)}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, email: buildRpgEmail(event.target.value) }))
                      }
                      required
                      className="min-w-0 flex-1 bg-transparent px-4 py-3 outline-none placeholder:text-on-surface-variant/55"
                      placeholder="username"
                    />
                    <span className="mono-data border-l border-outline-variant/20 bg-surface-container-low px-3 py-3 text-on-surface-variant">
                      {EMAIL_DOMAIN}
                    </span>
                  </div>
                )}
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="label-caps">Role</span>
                <select
                  value={form.role}
                  onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
                  className="form-input-base"
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {getRoleLabel(role)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="label-caps">{editingId ? "New Password" : "Password"}</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  required={!editingId}
                  className="form-input-base"
                  placeholder="••••••••"
                />
                {editingId ? (
                  <p className="text-xs text-on-surface-variant">
                    Leave blank to keep the current password.
                  </p>
                ) : null}
              </label>

              <label className="space-y-2">
                <span className="label-caps">{editingId ? "Confirm New Password" : "Confirm Password"}</span>
                <input
                  type="password"
                  value={form.password_confirmation}
                  onChange={(event) => setForm((prev) => ({ ...prev, password_confirmation: event.target.value }))}
                  required={!editingId || Boolean(form.password)}
                  className="form-input-base"
                  placeholder="••••••••"
                />
              </label>

              <div className="flex flex-wrap gap-2 md:col-span-2">
                <ActionButton
                  type="submit"
                  disabled={isSubmitting}
                  tone="primary"
                >
                  {isSubmitting ? "Saving..." : editingId ? "Update User" : "Create User"}
                </ActionButton>
                {editingId ? (
                  <ActionButton
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                  >
                    Cancel Edit
                  </ActionButton>
                ) : null}
              </div>
            </div>

            <aside className="rounded-[1.25rem] border border-outline-variant/15 bg-surface p-4">
              <p className="label-caps">Role Directory</p>
              <div className="mt-4 grid gap-2">
                {roleOptions.map((role) => (
                  <div
                    key={role}
                    className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/10 bg-surface-container-lowest px-3 py-2"
                  >
                    <span className={`form-chip ${getRoleChipClass(role)}`}>
                      {getRoleLabel(role)}
                    </span>
                    <span className="mono-data text-xs font-semibold text-on-surface-variant">
                      {records.filter((record) => record.role === role).length}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-outline-variant/10 bg-surface-container-low px-3 py-3">
                <p className="text-sm font-semibold text-on-surface">
                  {editingId ? "Edit mode is active" : "Create mode is active"}
                </p>
                <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                  {editingId
                    ? "Saving updates the selected user, then returns the form to create mode."
                    : "New accounts are created with the RPG email domain automatically attached."}
                </p>
              </div>
            </aside>
          </form>
        </SurfaceCard>
      ) : null}

      {!canCreateUsers && !canUpdateUsers ? (
        <InlineMessage tone="warning">
          Your account can read users, but it cannot create or update them.
        </InlineMessage>
      ) : null}

      {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}
      {message ? (
        <InlineMessage tone="primary">{message}</InlineMessage>
      ) : null}

      <DataTableCard>
        <div className="border-b border-outline-variant/15 bg-surface-container-low px-4 py-4 md:px-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="label-caps">Directory</p>
              <h2 className="mt-1 text-2xl font-bold text-on-surface">Users List</h2>
            </div>
            <p className="text-sm text-on-surface-variant">
              {visibleUsers} visible users on page {page}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-outline-variant/25 border-t-primary" />
            <div>
              <p className="font-semibold text-on-surface">Loading users</p>
              <p className="mt-1 text-sm text-on-surface-variant">
                Syncing the latest account directory.
              </p>
            </div>
          </div>
        ) : records.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No users found"
              description="Create the first RPG account to begin assigning roles and permissions."
            />
          </div>
        ) : (
          <>
            <div className="grid gap-3 p-3 lg:hidden">
              {records.map((record) => (
                <article
                  key={record.id}
                  className="rounded-[1.25rem] border border-outline-variant/15 bg-surface-container-lowest p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-container font-display text-sm font-bold text-on-primary-container">
                      {getUserInitials(record.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-semibold text-on-surface">
                        {record.name}
                      </h3>
                      <p className="mono-data mt-1 truncate text-xs text-on-surface-variant">
                        {record.email}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className={`form-chip ${getRoleChipClass(record.role)}`}>
                      {getRoleLabel(record.role)}
                    </span>
                    <StatusBadge tone={record.permission_source === "custom" ? "primary" : "default"}>
                      {record.permission_source === "custom" ? "Custom access" : "Role default"}
                    </StatusBadge>
                  </div>

                  <div className="mt-4 rounded-xl border border-outline-variant/10 bg-surface px-3 py-2">
                    <p className="label-caps">Access Summary</p>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {getPermissionSummary(record)}
                    </p>
                  </div>

                  <div className="mt-4 border-t border-outline-variant/10 pt-3">
                    {renderUserActions(record)}
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/15 bg-surface-container-low">
                    <th className="label-caps px-4 py-3">User</th>
                    <th className="label-caps px-4 py-3">Email</th>
                    <th className="label-caps px-4 py-3">Role</th>
                    <th className="label-caps px-4 py-3">Access</th>
                    <th className="label-caps px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="data-row">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-container font-display text-sm font-bold text-on-primary-container">
                            {getUserInitials(record.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-on-surface">{record.name}</p>
                            <p className="mono-data mt-0.5 text-xs text-on-surface-variant">
                              ID {record.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="mono-data px-4 py-4 text-xs text-on-surface-variant">
                        {record.email}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`form-chip ${getRoleChipClass(record.role)}`}>
                          {getRoleLabel(record.role)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col items-start gap-1.5">
                          <StatusBadge tone={record.permission_source === "custom" ? "primary" : "default"}>
                            {record.permission_source === "custom" ? "Custom access" : "Role default"}
                          </StatusBadge>
                          <span className="text-xs text-on-surface-variant">
                            {getPermissionSummary(record)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {renderUserActions(record, "end")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </DataTableCard>

      <PaginationControls
        page={page}
        totalPages={lastPage}
        onPrevious={() => loadUsers(page - 1)}
        onNext={() => loadUsers(page + 1)}
        onPageChange={(nextPage) => loadUsers(nextPage)}
      />
    </PageShell>
  );
}
