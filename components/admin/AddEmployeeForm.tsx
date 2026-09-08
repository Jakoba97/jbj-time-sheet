"use client";

import { useActionState } from "react";
import { createEmployeeAction } from "@/app/admin/employees/actions";

export function AddEmployeeForm() {
  const [state, formAction, pending] = useActionState(createEmployeeAction, {
    error: null,
    tempPassword: null,
  });

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-md border border-brand-rose/40 p-4">
      <h2 className="text-xl font-bold text-brand-gray">Add Employee</h2>
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-base font-medium text-brand-gray" htmlFor="fullName">
            Full Name
          </label>
          <input
            id="fullName"
            name="fullName"
            required
            className="h-12 w-56 rounded-md border border-brand-rose/50 px-3 text-lg focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/30"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-base font-medium text-brand-gray" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            name="username"
            required
            className="h-12 w-40 rounded-md border border-brand-rose/50 px-3 text-lg focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/30"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-base font-medium text-brand-gray" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            name="title"
            placeholder="e.g. Project Manager"
            className="h-12 w-48 rounded-md border border-brand-rose/50 px-3 text-lg focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/30"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-base font-medium text-brand-gray" htmlFor="role">
            Role
          </label>
          <select
            id="role"
            name="role"
            defaultValue="employee"
            className="h-12 w-40 rounded-md border border-brand-rose/50 px-3 text-lg focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/30"
          >
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="h-12 self-end rounded-md bg-brand-red px-6 text-lg font-semibold text-brand-white hover:bg-brand-maroon disabled:opacity-60"
        >
          {pending ? "Adding..." : "Add Employee"}
        </button>
      </div>
      {state.error && <p className="text-base font-medium text-brand-red">{state.error}</p>}
      {state.tempPassword && (
        <p className="rounded-md bg-brand-rose/20 p-3 text-base text-brand-gray">
          Employee created. Temporary password:{" "}
          <span className="font-mono font-bold">{state.tempPassword}</span>. Share this with
          them; it will not be shown again.
        </p>
      )}
    </form>
  );
}
