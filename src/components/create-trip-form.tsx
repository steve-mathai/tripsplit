"use client";

import { useActionState } from "react";
import { createTripAction, type CreateTripState } from "@/app/t/[slug]/actions";
import { ArrowRightIcon } from "./icons";

const INITIAL: CreateTripState = {};

export function CreateTripForm() {
  const [state, formAction, pending] = useActionState(createTripAction, INITIAL);
  const v = state.values ?? {};

  return (
    <form action={formAction} className="card space-y-4 p-5" id="start">
      <div>
        <label className="label" htmlFor="name">
          Trip name
        </label>
        <input id="name" name="name" className="field" placeholder="Goa with the college gang" defaultValue={v.name} required maxLength={80} />
      </div>
      <div>
        <label className="label" htmlFor="baseLocation">
          Where are you staying?
        </label>
        <input id="baseLocation" name="baseLocation" className="field" placeholder="Candolim, Goa" defaultValue={v.baseLocation} required maxLength={80} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="startDate">
            Starts
          </label>
          <input id="startDate" name="startDate" type="date" className="field" defaultValue={v.startDate} required />
        </div>
        <div>
          <label className="label" htmlFor="endDate">
            Ends
          </label>
          <input id="endDate" name="endDate" type="date" className="field" defaultValue={v.endDate} required />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="yourName">
          Your name
        </label>
        <input id="yourName" name="yourName" className="field" placeholder="Priya" defaultValue={v.yourName} required maxLength={40} autoComplete="given-name" />
      </div>
      <div>
        <label className="label" htmlFor="others">
          The others
        </label>
        <textarea
          id="others"
          name="others"
          rows={3}
          className="field"
          placeholder={"One per line or separated by commas\nArjun, Neha, Sameer"}
          defaultValue={v.others}
        />
      </div>
      {state.error && (
        <p role="alert" className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm font-semibold text-bad">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full !min-h-12 text-base">
        {pending ? "Creating..." : "Start the trip"}
        {!pending && <ArrowRightIcon width={18} height={18} />}
      </button>
    </form>
  );
}
