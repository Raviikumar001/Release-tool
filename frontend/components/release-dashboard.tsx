"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import { createRelease, deleteRelease, fetchReleases, fetchSteps, updateReleaseInfo, updateReleaseSteps } from "@/lib/api";
import { Release, StepDefinition } from "@/lib/types";

type Props = {
  initialReleases: Release[];
  steps: StepDefinition[];
};

type CreateForm = {
  name: string;
  dueDate: string;
  additionalInfo: string;
};

const emptyForm: CreateForm = {
  name: "",
  dueDate: "",
  additionalInfo: "",
};

export function ReleaseDashboard({ initialReleases, steps }: Props) {
  const [releases, setReleases] = useState<Release[]>(initialReleases);
  const [stepDefinitions, setStepDefinitions] = useState<StepDefinition[]>(steps);
  const [selectedId, setSelectedId] = useState<string | null>(initialReleases[0]?.id ?? null);
  const [form, setForm] = useState<CreateForm>(emptyForm);
  const [notesDraft, setNotesDraft] = useState(initialReleases[0]?.additionalInfo ?? "");
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(initialReleases.length === 0 && steps.length === 0);
  const [error, setError] = useState<string | null>(null);

  const selectedRelease = useMemo(
    () => releases.find((release) => release.id === selectedId) ?? null,
    [releases, selectedId],
  );

  useEffect(() => {
    setNotesDraft(selectedRelease?.additionalInfo ?? "");
  }, [selectedRelease]);

  useEffect(() => {
    if (initialReleases.length > 0 || steps.length > 0) {
      return;
    }

    let ignore = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [nextReleases, nextSteps] = await Promise.all([fetchReleases(), fetchSteps()]);
        if (ignore) {
          return;
        }
        setReleases(nextReleases);
        setStepDefinitions(nextSteps);
        setSelectedId(nextReleases[0]?.id ?? null);
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load releases");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [initialReleases.length, steps.length]);

  async function handleCreateRelease(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsCreating(true);

    try {
      const release = await createRelease({
        name: form.name.trim(),
        dueDate: new Date(form.dueDate).toISOString(),
        additionalInfo: form.additionalInfo.trim(),
      });
      setReleases((current) => [...current, release].sort((a, b) => a.dueDate.localeCompare(b.dueDate)));
      setSelectedId(release.id);
      setNotesDraft(release.additionalInfo);
      setForm(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create release");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleToggleStep(stepKey: string, checked: boolean) {
    if (!selectedRelease) {
      return;
    }

    const nextState = {
      ...selectedRelease.stepsState,
      [stepKey]: checked,
    };

    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateReleaseSteps(selectedRelease.id, nextState);
      setReleases((current) => current.map((release) => (release.id === updated.id ? updated : release)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update checklist");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveInfo() {
    if (!selectedRelease) {
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateReleaseInfo(selectedRelease.id, notesDraft);
      setReleases((current) => current.map((release) => (release.id === updated.id ? updated : release)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save notes");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteRelease() {
    if (!selectedRelease) {
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await deleteRelease(selectedRelease.id);
      const nextReleases = releases.filter((release) => release.id !== selectedRelease.id);
      setReleases(nextReleases);
      setSelectedId(nextReleases[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete release");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#172033_0%,#090b13_48%,#06070b_100%)] px-4 py-10 text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="rounded-[32px] border border-white/10 bg-slate-950/70 px-6 py-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur md:px-8">
          <div className="mb-8 flex items-start justify-between gap-6 border-b border-white/10 pb-6">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.32em] text-cyan-300/70">Release checklist tool</p>
              <h1 className="text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">ReleaseCheck</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400 md:text-base">
                A dark release control room for planning, executing, and closing product launches without losing the operational checklist.
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">Active releases</p>
              <p className="mt-2 text-3xl font-semibold text-cyan-100">{releases.length}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_1.6fr]">
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Releases</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Delivery queue</h2>
                </div>
              </div>

              <div className="space-y-3">
                {isLoading ? (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-400">
                    Loading releases...
                  </div>
                ) : releases.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-400">
                    No releases yet. Create the first one from the panel below.
                  </div>
                ) : (
                  releases.map((release) => {
                    const selected = release.id === selectedId;
                    return (
                      <button
                        key={release.id}
                        type="button"
                        onClick={() => setSelectedId(release.id)}
                        className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                          selected
                            ? "border-cyan-300/50 bg-cyan-300/10 shadow-[0_0_0_1px_rgba(103,232,249,0.18)]"
                            : "border-white/8 bg-black/10 hover:border-white/16 hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-base font-medium text-white">{release.name}</p>
                            <p className="mt-1 text-sm text-slate-400">{formatDate(release.dueDate)}</p>
                          </div>
                          <StatusPill status={release.status} />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              {selectedRelease ? (
                <>
                  <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Selected release</p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">{selectedRelease.name}</h2>
                      <p className="mt-2 text-sm text-slate-400">Due {formatDateTime(selectedRelease.dueDate)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDeleteRelease}
                      disabled={isSaving}
                      className="rounded-full border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Delete release
                    </button>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Checklist</h3>
                        <StatusPill status={selectedRelease.status} />
                      </div>
                      <div className="space-y-3">
                        {stepDefinitions.map((step) => (
                          <label
                            key={step.key}
                            className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-slate-200"
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(selectedRelease.stepsState[step.key])}
                              onChange={(event) => handleToggleStep(step.key, event.target.checked)}
                              className="h-4 w-4 rounded border-white/20 bg-slate-950 text-cyan-300 focus:ring-cyan-300"
                            />
                            <span>{step.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Notes</h3>
                        <button
                          type="button"
                          onClick={handleSaveInfo}
                          disabled={isSaving}
                          className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Save notes
                        </button>
                      </div>
                      <textarea
                        id="release-notes"
                        value={notesDraft}
                        onChange={(event) => setNotesDraft(event.target.value)}
                        placeholder="Deployment notes, rollback reminders, links, owners, or post-release tasks."
                        className="min-h-72 w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-4 text-sm leading-7 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex min-h-[22rem] items-center justify-center rounded-3xl border border-dashed border-white/10 text-center text-sm text-slate-400">
                  Select a release or create a new one.
                </div>
              )}
            </section>
          </div>
        </header>

        <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur md:p-8">
          <div className="mb-6 flex items-end justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">New release</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Create release window</h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-slate-400">
              Name, release timestamp, and optional operational notes are the only editable fields. Status is derived from the checklist automatically.
            </p>
          </div>

          <form className="grid gap-5 lg:grid-cols-[1fr_1fr]" onSubmit={handleCreateRelease}>
            <label className="space-y-2 text-sm text-slate-300">
              <span className="font-medium text-slate-200">Release name</span>
              <input
                required
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none transition focus:border-cyan-300/50"
                placeholder="Version 2.4.0"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-300">
              <span className="font-medium text-slate-200">Release date</span>
              <input
                required
                type="datetime-local"
                value={form.dueDate}
                onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none transition focus:border-cyan-300/50"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-300 lg:col-span-2">
              <span className="font-medium text-slate-200">Additional information</span>
              <textarea
                value={form.additionalInfo}
                onChange={(event) => setForm((current) => ({ ...current, additionalInfo: event.target.value }))}
                className="min-h-36 w-full rounded-3xl border border-white/10 bg-black/20 px-4 py-4 outline-none transition focus:border-cyan-300/50"
                placeholder="Release notes summary, deployment window, rollback checklist, and reminders."
              />
            </label>

            <div className="flex items-center gap-4 lg:col-span-2">
              <button
                type="submit"
                disabled={isCreating}
                className="rounded-full bg-cyan-300 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? "Creating..." : "Create release"}
              </button>
              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Release["status"] }) {
  const tones: Record<Release["status"], string> = {
    planned: "border-slate-500/30 bg-slate-500/10 text-slate-200",
    ongoing: "border-amber-400/30 bg-amber-400/12 text-amber-100",
    done: "border-emerald-400/30 bg-emerald-400/12 text-emerald-100",
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${tones[status]}`}>
      {status}
    </span>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
