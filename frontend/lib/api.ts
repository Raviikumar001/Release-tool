import { Release, StepDefinition } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function fetchReleases(): Promise<Release[]> {
  const payload = await request<{ releases: Release[] }>("/releases");
  return payload.releases;
}

export async function fetchSteps(): Promise<StepDefinition[]> {
  const payload = await request<{ steps: StepDefinition[] }>("/meta/steps");
  return payload.steps;
}

export async function createRelease(input: {
  name: string;
  dueDate: string;
  additionalInfo: string;
}): Promise<Release> {
  return request<Release>("/releases", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateReleaseInfo(id: string, additionalInfo: string): Promise<Release> {
  return request<Release>(`/releases/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ additionalInfo }),
  });
}

export async function updateReleaseSteps(id: string, stepsState: Record<string, boolean>): Promise<Release> {
  return request<Release>(`/releases/${id}/steps`, {
    method: "PATCH",
    body: JSON.stringify({ stepsState }),
  });
}

export async function deleteRelease(id: string): Promise<void> {
  return request<void>(`/releases/${id}`, { method: "DELETE" });
}
