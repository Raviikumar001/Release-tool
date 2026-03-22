export type ReleaseStatus = "planned" | "ongoing" | "done";

export type StepDefinition = {
  key: string;
  label: string;
};

export type Release = {
  id: string;
  name: string;
  dueDate: string;
  status: ReleaseStatus;
  additionalInfo: string;
  stepsState: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
};
