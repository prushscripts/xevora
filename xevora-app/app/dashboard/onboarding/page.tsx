"use client";

import {
  BuildingOffice2Icon,
  CheckIcon,
  CreditCardIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

const industries = [
  "Trucking & Logistics",
  "HVAC",
  "Construction",
  "Landscaping",
  "Electrical",
  "Plumbing",
  "Staffing",
  "Other Field Services",
];

const companySizes = ["Just me (1)", "2-5 employees", "6-15 employees", "16-30 employees", "31-50 employees", "50+ employees"];

const usStates = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

const timezones = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Phoenix",
  "America/Detroit",
  "America/Indiana/Indianapolis",
  "America/Boise",
  "America/Juneau",
];

type Frequency = "weekly" | "biweekly" | "monthly";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");
  const [ein, setEin] = useState("");
  const [payFrequency, setPayFrequency] = useState<Frequency>("biweekly");
  const [timezone, setTimezone] = useState("America/New_York");
  const [overtimeThreshold, setOvertimeThreshold] = useState("40");
  const [requireGps, setRequireGps] = useState(true);

  function validateStep() {
    if (step === 1) return companyName.trim() && industry.trim();
    if (step === 2) return city.trim() && stateCode.trim();
    return true;
  }

  async function handleComplete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateStep()) {
      setError("Please complete the required fields.");
      return;
    }

    if (step < 3) {
      setError(null);
      setStep((value) => value + 1);
      return;
    }

    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Unable to identify your account.");
      setLoading(false);
      return;
    }

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        name: companyName.trim(),
        industry: industry.trim(),
        size: companySize.trim() || null,
        address: address.trim() || null,
        city: city.trim(),
        state: stateCode.trim(),
        zip: zip.trim() || null,
        phone: phone.trim() || null,
        ein: ein.trim() || null,
        owner_id: user.id,
      })
      .select("id")
      .single<{ id: string }>();

    if (companyError || !company) {
      setError("Unable to create your company profile.");
      setLoading(false);
      return;
    }

    const { error: settingsError } = await supabase.from("company_settings").insert({
      company_id: company.id,
      payroll_frequency: payFrequency,
      timezone,
      overtime_threshold: Number(overtimeThreshold) || 40,
      require_gps_clockin: requireGps,
    });

    if (settingsError) {
      setError("Company created, but settings failed to save.");
      setLoading(false);
      return;
    }

    await supabase.from("companies").update({ onboarding_complete: true }).eq("id", company.id);

    setSuccess(true);
    setLoading(false);
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 500);
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-[600px] flex-col justify-center py-8">
      <div className="mb-8 flex items-center justify-center gap-4">
        {[1, 2, 3].map((item) => {
          const complete = item < step || success;
          const active = item === step && !success;
          return (
            <div
              key={item}
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm ${
                complete || active
                  ? "border-[var(--blue)] bg-[rgba(37,99,235,0.2)] text-[var(--blue-bright)]"
                  : "border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              {complete ? <CheckIcon className="h-4 w-4" /> : item}
            </div>
          );
        })}
      </div>

      <form onSubmit={handleComplete} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        {success ? (
          <div className="py-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(52,211,153,0.16)]">
              <CheckIcon className="h-6 w-6 text-[var(--green)]" />
            </div>
            <h2 className="mt-4 text-2xl font-extrabold">You&apos;re all set!</h2>
          </div>
        ) : null}

        {!success && step === 1 ? (
          <section className="space-y-4">
            <div>
              <h1 className="text-2xl font-extrabold">Tell us about your business</h1>
              <p className="mt-1 text-sm text-[var(--muted)]">This takes less than 2 minutes.</p>
            </div>
            <div>
              <label className="mb-2 block text-sm text-[var(--muted)]">Company Name*</label>
              <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Prush Logistics Group LLC" className="w-full rounded-lg border border-[var(--border)] bg-[#030508] px-3 py-2 text-sm outline-none focus:border-[var(--blue)]" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-[var(--muted)]">Industry*</label>
              <select value={industry} onChange={(event) => setIndustry(event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[#030508] px-3 py-2 text-sm outline-none focus:border-[var(--blue)]">
                <option value="">Select industry</option>
                {industries.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-[var(--muted)]">Company Size</label>
              <select value={companySize} onChange={(event) => setCompanySize(event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[#030508] px-3 py-2 text-sm outline-none focus:border-[var(--blue)]">
                <option value="">Select size</option>
                {companySizes.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </section>
        ) : null}

        {!success && step === 2 ? (
          <section className="space-y-4">
            <h1 className="text-2xl font-extrabold">Where are you based?</h1>
            <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Business Address" className="w-full rounded-lg border border-[var(--border)] bg-[#030508] px-3 py-2 text-sm outline-none focus:border-[var(--blue)]" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-[var(--muted)]">City*</label>
                <input value={city} onChange={(event) => setCity(event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[#030508] px-3 py-2 text-sm outline-none focus:border-[var(--blue)]" />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--muted)]">State*</label>
                <select value={stateCode} onChange={(event) => setStateCode(event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[#030508] px-3 py-2 text-sm outline-none focus:border-[var(--blue)]">
                  <option value="">Select state</option>
                  {usStates.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <input value={zip} onChange={(event) => setZip(event.target.value)} placeholder="ZIP Code" className="w-full rounded-lg border border-[var(--border)] bg-[#030508] px-3 py-2 text-sm outline-none focus:border-[var(--blue)]" />
            <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Business Phone" className="w-full rounded-lg border border-[var(--border)] bg-[#030508] px-3 py-2 text-sm outline-none focus:border-[var(--blue)]" />
            <div>
              <input value={ein} onChange={(event) => setEin(event.target.value)} placeholder="EIN (optional)" className="w-full rounded-lg border border-[var(--border)] bg-[#030508] px-3 py-2 text-sm outline-none focus:border-[var(--blue)]" />
              <p className="mt-1 text-xs text-[var(--muted)]">Your Employer ID Number - you can add this later</p>
            </div>
          </section>
        ) : null}

        {!success && step === 3 ? (
          <section className="space-y-4">
            <h1 className="text-2xl font-extrabold">How do you want to pay your team?</h1>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                { key: "weekly" as const, label: "Weekly", icon: CreditCardIcon },
                { key: "biweekly" as const, label: "Biweekly", icon: BuildingOffice2Icon },
                { key: "monthly" as const, label: "Monthly", icon: GlobeAltIcon },
              ].map((option) => {
                const Icon = option.icon;
                const active = payFrequency === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setPayFrequency(option.key)}
                    className={`rounded-lg border px-3 py-3 text-left transition ${
                      active
                        ? "border-[var(--blue)] bg-[rgba(37,99,235,0.16)] text-[var(--blue-bright)]"
                        : "border-[var(--border)] bg-[#030508] text-[var(--muted)]"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <p className="mt-1 text-sm">{option.label}</p>
                  </button>
                );
              })}
            </div>
            <div>
              <label className="mb-2 block text-sm text-[var(--muted)]">Timezone</label>
              <select value={timezone} onChange={(event) => setTimezone(event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[#030508] px-3 py-2 text-sm outline-none focus:border-[var(--blue)]">
                {timezones.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-[var(--muted)]">Overtime after</label>
              <div className="flex items-center gap-2">
                <input value={overtimeThreshold} onChange={(event) => setOvertimeThreshold(event.target.value)} className="w-24 rounded-lg border border-[var(--border)] bg-[#030508] px-3 py-2 text-sm outline-none focus:border-[var(--blue)]" />
                <span className="text-sm text-[var(--muted)]">hours/week</span>
              </div>
            </div>
            <label className="flex items-start gap-2 text-sm text-[var(--muted)]">
              <input type="checkbox" checked={requireGps} onChange={(event) => setRequireGps(event.target.checked)} className="mt-1 h-4 w-4 accent-[var(--blue)]" />
              <span>
                Require GPS clock-in
                <span className="block text-xs">Workers must have GPS enabled to clock in</span>
              </span>
            </label>
          </section>
        ) : null}

        {error ? <p className="mt-4 text-sm text-[var(--red)]">{error}</p> : null}

        {!success ? (
          <div className="mt-6 flex gap-2">
            {step > 1 ? (
              <button type="button" onClick={() => setStep((value) => value - 1)} className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2 text-sm">
                ← Back
              </button>
            ) : null}
            <button type="submit" disabled={loading} className="flex-1 rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-medium text-white disabled:opacity-70">
              {loading ? "Saving..." : step === 3 ? "Complete Setup" : "Continue →"}
            </button>
          </div>
        ) : null}
      </form>
    </main>
  );
}
