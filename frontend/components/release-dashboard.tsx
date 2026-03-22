"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import {
  createRelease,
  deleteRelease,
  fetchReleases,
  fetchSteps,
  updateReleaseInfo,
  updateReleaseSteps,
} from "@/lib/api";
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateForm>(emptyForm);
  const [notesDraft, setNotesDraft] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
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
      setReleases(initialReleases);
      setStepDefinitions(steps);
      setIsLoading(false);
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
  }, [initialReleases, steps]);

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
      setIsCreateMode(false);
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

  async function handleDeleteRelease(id: string) {
    setIsSaving(true);
    setError(null);
    try {
      await deleteRelease(id);
      const nextReleases = releases.filter((release) => release.id !== id);
      setReleases(nextReleases);
      if (selectedId === id) {
        setSelectedId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete release");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-white">ReleaseCheck</h1>
        </header>

        <section className="overflow-hidden rounded-[24px] border border-white/10 bg-black">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <button
              type="button"
              onClick={() => {
                setIsCreateMode(false);
                setSelectedId(null);
              }}
              className="text-sm text-white/60 transition hover:text-white"
            >
              All releases
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreateMode(true);
                setSelectedId(null);
                setError(null);
              }}
              className="rounded-md border border-white bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-white/90"
            >
              New release
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/70">
                  <th className="px-5 py-3 font-medium">Release</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                  <th className="px-5 py-3 font-medium">Delete</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-white/50">
                      Loading releases...
                    </td>
                  </tr>
                ) : releases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-white/50">
                      No releases found.
                    </td>
                  </tr>
                ) : (
                  releases.map((release) => (
                    <tr key={release.id} className="border-b border-white/10 last:border-b-0">
                      <td className="px-5 py-4 text-white">{release.name}</td>
                      <td className="px-5 py-4 text-white/70">{formatDate(release.dueDate)}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-wide text-white/80">
                          {release.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(release.id);
                            setIsCreateMode(false);
                          }}
                          className="text-white underline-offset-4 transition hover:underline"
                        >
                          View
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => handleDeleteRelease(release.id)}
                          disabled={isSaving}
                          className="text-white/70 underline-offset-4 transition hover:text-white hover:underline disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

        {isCreateMode ? (
          <section className="mt-8 rounded-[24px] border border-white/10 bg-black p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-white">New release</h2>
              <button
                type="button"
                onClick={() => setIsCreateMode(false)}
                className="text-sm text-white/60 transition hover:text-white"
              >
                Close
              </button>
            </div>

            <form className="grid gap-5 md:grid-cols-2" onSubmit={handleCreateRelease}>
              <label className="block">
                <span className="mb-2 block text-sm text-white/70">Release</span>
                <input
                  required
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className={inputClassName}
                  placeholder="Version 2.4.0"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-white/70">Date</span>
                <input
                  required
                  type="datetime-local"
                  value={form.dueDate}
                  onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
                  className={inputClassName}
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm text-white/70">Additional information</span>
                <textarea
                  value={form.additionalInfo}
                  onChange={(event) => setForm((current) => ({ ...current, additionalInfo: event.target.value }))}
                  className={`${inputClassName} min-h-40 py-4`}
                  placeholder="Add notes for this release"
                />
              </label>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="rounded-md border border-white bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-60"
                >
                  {isCreating ? "Creating..." : "Create release"}
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {selectedRelease ? (
          <section className="mt-8 rounded-[24px] border border-white/10 bg-black p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-2xl font-semibold text-white">{selectedRelease.name}</h2>
                <p className="mt-1 text-sm text-white/60">{formatDateTime(selectedRelease.dueDate)}</p>
              </div>
              <span className="inline-flex rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-wide text-white/80">
                {selectedRelease.status}
              </span>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <div>
                <h3 className="mb-4 text-sm font-medium uppercase tracking-wide text-white/60">Checklist</h3>
                <div className="space-y-3">
                  {stepDefinitions.map((step) => (
                    <label
                      key={step.key}
                      className="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(selectedRelease.stepsState[step.key])}
                        onChange={(event) => handleToggleStep(step.key, event.target.checked)}
                        className="h-4 w-4 rounded border-white/20 bg-black"
                      />
                      <span className="text-sm text-white/90">{step.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-4 text-sm font-medium uppercase tracking-wide text-white/60">Additional remarks / tasks</h3>
                <textarea
                  value={notesDraft}
                  onChange={(event) => setNotesDraft(event.target.value)}
                  className={`${inputClassName} min-h-72 py-4`}
                  placeholder="Please enter notes for the release"
                />
                <button
                  type="button"
                  onClick={handleSaveInfo}
                  disabled={isSaving}
                  className="mt-4 rounded-md border border-white bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-60"
                >
                  Save
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

const inputClassName =
  "w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-white/30";
