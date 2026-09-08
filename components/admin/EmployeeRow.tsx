"use client";

import { useState, useTransition } from "react";
import {
  resetPasswordAction,
  setEmployeeActiveAction,
  updateEmployeeAction,
} from "@/app/admin/employees/actions";

export function EmployeeRow({
  id,
  fullName,
  title,
  username,
  role,
  active,
}: {
  id: string;
  fullName: string;
  title: string | null;
  username: string;
  role: string;
  active: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await updateEmployeeAction(id, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <form
        onSubmit={handleSave}
        data-testid="employee-row"
        data-username={username}
        className="flex flex-col gap-3 rounded-md border border-brand-rose/40 px-4 py-3"
      >
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-brand-gray" htmlFor={`fullName-${id}`}>
              Full Name
            </label>
            <input
              id={`fullName-${id}`}
              name="fullName"
              defaultValue={fullName}
              required
              className="h-10 w-48 rounded-md border border-brand-rose/50 px-3 text-base focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/30"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-brand-gray" htmlFor={`title-${id}`}>
              Title
            </label>
            <input
              id={`title-${id}`}
              name="title"
              defaultValue={title ?? ""}
              placeholder="e.g. Project Manager"
              className="h-10 w-44 rounded-md border border-brand-rose/50 px-3 text-base focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/30"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-brand-gray" htmlFor={`username-${id}`}>
              Username
            </label>
            <input
              id={`username-${id}`}
              name="username"
              defaultValue={username}
              required
              className="h-10 w-36 rounded-md border border-brand-rose/50 px-3 text-base focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/30"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-brand-gray" htmlFor={`role-${id}`}>
              Role
            </label>
            <select
              id={`role-${id}`}
              name="role"
              defaultValue={role}
              className="h-10 w-36 rounded-md border border-brand-rose/50 px-3 text-base focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/30"
            >
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        {error && <p className="text-base font-medium text-brand-red">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="h-10 rounded-md bg-brand-red px-4 text-base font-semibold text-brand-white hover:bg-brand-maroon disabled:opacity-60"
          >
            {pending ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              setEditing(false);
            }}
            className="h-10 rounded-md border-2 border-brand-gray px-4 text-base font-semibold text-brand-gray hover:bg-brand-gray hover:text-brand-white disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div
      data-testid="employee-row"
      data-username={username}
      className="flex flex-col gap-2 rounded-md border border-brand-rose/40 px-4 py-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-lg font-medium text-brand-gray">{fullName}</span>
          {title && <span className="text-lg text-brand-gray"> &middot; {title}</span>}{" "}
          <span className="text-base text-brand-gray">
            ({username}, {role}
            {!active ? ", inactive" : ""})
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => setEditing(true)}
            className="h-10 rounded-md border-2 border-brand-gray px-4 text-base font-semibold text-brand-gray hover:bg-brand-gray hover:text-brand-white disabled:opacity-60"
          >
            Edit
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setTempPassword(null);
              startTransition(async () => {
                const result = await resetPasswordAction(id);
                if (result.tempPassword) setTempPassword(result.tempPassword);
              });
            }}
            className="h-10 rounded-md border-2 border-brand-red px-4 text-base font-semibold text-brand-red hover:bg-brand-red hover:text-brand-white disabled:opacity-60"
          >
            Reset Password
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => setEmployeeActiveAction(id, !active))}
            className="h-10 rounded-md border-2 border-brand-gray px-4 text-base font-semibold text-brand-gray hover:bg-brand-gray hover:text-brand-white disabled:opacity-60"
          >
            {active ? "Deactivate" : "Reactivate"}
          </button>
        </div>
      </div>
      {tempPassword && (
        <p className="rounded-md bg-brand-rose/20 p-2 text-base text-brand-gray">
          New temporary password: <span className="font-mono font-bold">{tempPassword}</span>
        </p>
      )}
    </div>
  );
}
