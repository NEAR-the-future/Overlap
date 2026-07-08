"use client";

import type { FormEvent, PointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Database,
  Filter,
  LogIn,
  Plus,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import type {
  AvailabilitySlotRow,
  ParticipantRow,
  ProjectMemberRow,
  ProjectRow,
} from "@/lib/supabase";
import {
  isSupabaseConfigured,
  supabase,
} from "@/lib/supabase";

type Participant = Pick<ParticipantRow, "id" | "name" | "created_at">;
type Project = Pick<ProjectRow, "id" | "name" | "created_at"> & {
  memberIds: string[];
};
type AvailabilityMap = Record<string, string[]>;
type HoverState = {
  slotKey: string;
  names: string[];
  x: number;
  y: number;
} | null;

const DAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
];

const HOURS = Array.from({ length: 17 }, (_, index) => {
  const totalMinutes = 9 * 60 + index * 30;
  return {
    hour: Math.floor(totalMinutes / 60),
    minute: totalMinutes % 60,
  };
});

const SEED_PARTICIPANTS: Participant[] = [];
const SEED_AVAILABILITY: AvailabilityMap = {};
const SEED_PROJECTS: Project[] = [];

function formatTime(hour: number, minute: number) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${suffix}`;
}

function slotKey(dayKey: string, hour: number, minute: number) {
  return `${dayKey}-${hour.toString().padStart(2, "0")}-${minute
    .toString()
    .padStart(2, "0")}`;
}

function daySlotKeys(dayKey: string) {
  return HOURS.map((time) => slotKey(dayKey, time.hour, time.minute));
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function sortedParticipants(participants: Participant[]) {
  return [...participants].sort((a, b) => a.name.localeCompare(b.name));
}

export default function SchedulerPage() {
  const [participants, setParticipants] = useState<Participant[]>(SEED_PARTICIPANTS);
  const [availability, setAvailability] = useState<AvailabilityMap>(SEED_AVAILABILITY);
  const [projects, setProjects] = useState<Project[]>(SEED_PROJECTS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(SEED_PARTICIPANTS.map((participant) => participant.id)),
  );
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [projectName, setProjectName] = useState("");
  const [mode, setMode] = useState<"group" | "input">("group");
  const [projectFilter, setProjectFilter] = useState("all");
  const [isAdminOpen, setIsAdminOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [status, setStatus] = useState(
    isSupabaseConfigured ? "Connecting to Supabase" : "Demo mode: add Supabase env vars to persist",
  );
  const [hoveredSlot, setHoveredSlot] = useState<HoverState>(null);
  const dragRef = useRef<{ active: boolean; paintAvailable: boolean | null }>({
    active: false,
    paintAvailable: null,
  });

  const orderedParticipants = useMemo(() => sortedParticipants(participants), [participants]);
  const selectedParticipants = useMemo(
    () => orderedParticipants.filter((participant) => selectedIds.has(participant.id)),
    [orderedParticipants, selectedIds],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!supabase) {
        return;
      }

      setIsLoading(true);
      const [
        participantsResult,
        availabilityResult,
        projectsResult,
        projectMembersResult,
      ] = await Promise.all([
        supabase.from("participants").select("*").order("name", { ascending: true }),
        supabase.from("availability_slots").select("*"),
        supabase.from("projects").select("*").order("name", { ascending: true }),
        supabase.from("project_members").select("*"),
      ]);

      if (cancelled) {
        return;
      }

      const firstError =
        participantsResult.error ||
        availabilityResult.error ||
        projectsResult.error ||
        projectMembersResult.error;

      if (firstError) {
        setStatus(firstError.message);
        setIsLoading(false);
        return;
      }

      const participantRows = (participantsResult.data ?? []) as ParticipantRow[];
      const availabilityRows = (availabilityResult.data ?? []) as AvailabilitySlotRow[];
      const projectRows = (projectsResult.data ?? []) as ProjectRow[];
      const projectMemberRows = (projectMembersResult.data ?? []) as ProjectMemberRow[];

      const nextAvailability: AvailabilityMap = {};
      for (const participant of participantRows) {
        nextAvailability[participant.id] = [];
      }
      for (const row of availabilityRows) {
        nextAvailability[row.participant_id] = [
          ...(nextAvailability[row.participant_id] ?? []),
          row.slot_key,
        ];
      }

      const memberMap = new Map<string, string[]>();
      for (const row of projectMemberRows) {
        memberMap.set(row.project_id, [
          ...(memberMap.get(row.project_id) ?? []),
          row.participant_id,
        ]);
      }

      setParticipants(participantRows);
      setAvailability(nextAvailability);
      setProjects(
        projectRows.map((project) => ({
          ...project,
          memberIds: memberMap.get(project.id) ?? [],
        })),
      );
      setSelectedIds(new Set(participantRows.map((participant) => participant.id)));
      setStatus("Synced with Supabase");
      setIsLoading(false);
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function endDrag() {
      dragRef.current = { active: false, paintAvailable: null };
    }

    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, []);

  function getParticipantSlots(participantId: string) {
    return new Set(availability[participantId] ?? []);
  }

  function namesForSlot(key: string) {
    return selectedParticipants
      .filter((participant) => getParticipantSlots(participant.id).has(key))
      .map((participant) => participant.name);
  }

  function slotStrength(key: string) {
    const names = namesForSlot(key);
    return {
      names,
      count: names.length,
      ratio: selectedParticipants.length ? names.length / selectedParticipants.length : 0,
    };
  }

  function setSlotLocally(participantId: string, key: string, available: boolean) {
    setAvailability((current) => {
      const nextSlots = new Set(current[participantId] ?? []);
      if (available) {
        nextSlots.add(key);
      } else {
        nextSlots.delete(key);
      }

      return {
        ...current,
        [participantId]: Array.from(nextSlots),
      };
    });
  }

  function setSlotsLocally(participantId: string, keys: string[], available: boolean) {
    setAvailability((current) => {
      const nextSlots = new Set(current[participantId] ?? []);
      for (const key of keys) {
        if (available) {
          nextSlots.add(key);
        } else {
          nextSlots.delete(key);
        }
      }

      return {
        ...current,
        [participantId]: Array.from(nextSlots),
      };
    });
  }

  async function persistSlot(participantId: string, key: string, available: boolean) {
    if (!supabase) {
      return;
    }

    const result = available
      ? await supabase
          .from("availability_slots")
          .upsert({ participant_id: participantId, slot_key: key })
      : await supabase
          .from("availability_slots")
          .delete()
          .match({ participant_id: participantId, slot_key: key });

    if (result.error) {
      setStatus(result.error.message);
    } else {
      setStatus("Saved");
    }
  }

  async function persistSlots(participantId: string, keys: string[], available: boolean) {
    if (!supabase || keys.length === 0) {
      return;
    }

    const result = available
      ? await supabase.from("availability_slots").upsert(
          keys.map((key) => ({
            participant_id: participantId,
            slot_key: key,
          })),
        )
      : await supabase
          .from("availability_slots")
          .delete()
          .eq("participant_id", participantId)
          .in("slot_key", keys);

    setStatus(result.error ? result.error.message : "Saved");
  }

  function toggleDayAvailability(dayKey: string) {
    if (mode !== "input" || !currentParticipant) {
      return;
    }

    const keys = daySlotKeys(dayKey);
    const currentSlots = getParticipantSlots(currentParticipant.id);
    const shouldSelectDay = keys.some((key) => !currentSlots.has(key));

    setSlotsLocally(currentParticipant.id, keys, shouldSelectDay);
    void persistSlots(currentParticipant.id, keys, shouldSelectDay);
  }

  function paintSlot(key: string, available: boolean) {
    if (!currentParticipant) {
      return;
    }

    const currentSlots = getParticipantSlots(currentParticipant.id);
    if (currentSlots.has(key) === available) {
      return;
    }

    setSlotLocally(currentParticipant.id, key, available);
    void persistSlot(currentParticipant.id, key, available);
  }

  function handleSlotPointerDown(event: PointerEvent<HTMLButtonElement>, key: string) {
    if (mode !== "input" || !currentParticipant) {
      return;
    }

    event.preventDefault();
    const isAlreadyAvailable = getParticipantSlots(currentParticipant.id).has(key);
    const shouldPaint = !isAlreadyAvailable;
    dragRef.current = { active: true, paintAvailable: shouldPaint };
    paintSlot(key, shouldPaint);
  }

  function handleSlotPointerEnter(key: string) {
    if (mode !== "input" || !currentParticipant || !dragRef.current.active) {
      return;
    }

    paintSlot(key, Boolean(dragRef.current.paintAvailable));
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = nameInput.trim();
    if (!normalizedName) {
      return;
    }

    const existing = participants.find(
      (participant) => participant.name.toLowerCase() === normalizedName.toLowerCase(),
    );
    if (existing) {
      setCurrentParticipant(existing);
      setMode("input");
      setSelectedIds((current) => new Set(current).add(existing.id));
      setStatus(`Signed in as ${existing.name}`);
      return;
    }

    if (!supabase) {
      const createdParticipant = {
        id: crypto.randomUUID(),
        name: normalizedName,
        created_at: new Date().toISOString(),
      };
      setParticipants((current) => [...current, createdParticipant]);
      setAvailability((current) => ({ ...current, [createdParticipant.id]: [] }));
      setCurrentParticipant(createdParticipant);
      setMode("input");
      setSelectedIds((current) => new Set(current).add(createdParticipant.id));
      setNameInput("");
      setStatus(`Signed in as ${createdParticipant.name}`);
      return;
    }

    const insertResult = await supabase
      .from("participants")
      .insert({ name: normalizedName })
      .select("*")
      .single();

    if (insertResult.error) {
      const selectResult = await supabase
        .from("participants")
        .select("*")
        .ilike("name", normalizedName)
        .maybeSingle();

      if (selectResult.error || !selectResult.data) {
        setStatus(insertResult.error.message);
        return;
      }

      const foundParticipant = selectResult.data as ParticipantRow;
      setParticipants((current) =>
        current.some((participant) => participant.id === foundParticipant.id)
          ? current
          : [...current, foundParticipant],
      );
      setCurrentParticipant(foundParticipant);
      setMode("input");
      setSelectedIds((current) => new Set(current).add(foundParticipant.id));
      setNameInput("");
      setStatus(`Signed in as ${foundParticipant.name}`);
      return;
    }

    const createdParticipant = insertResult.data as ParticipantRow;
    setParticipants((current) => [...current, createdParticipant]);
    setAvailability((current) => ({ ...current, [createdParticipant.id]: [] }));
    setCurrentParticipant(createdParticipant);
    setMode("input");
    setSelectedIds((current) => new Set(current).add(createdParticipant.id));
    setNameInput("");
    setStatus(`Signed in as ${createdParticipant.name}`);
  }

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = projectName.trim();
    if (!normalizedName) {
      return;
    }

    if (!supabase) {
      setProjects((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          name: normalizedName,
          created_at: new Date().toISOString(),
          memberIds: [],
        },
      ]);
      setProjectName("");
      setStatus(`Created ${normalizedName}`);
      return;
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({ name: normalizedName })
      .select("*")
      .single();

    if (error) {
      setStatus(error.message);
      return;
    }

    const createdProject = data as ProjectRow;
    setProjects((current) => [...current, { ...createdProject, memberIds: [] }]);
    setProjectName("");
    setStatus(`Created ${createdProject.name}`);
  }

  async function handleDeleteProject(projectId: string) {
    const project = projects.find((item) => item.id === projectId);
    setProjects((current) => current.filter((item) => item.id !== projectId));
    if (projectFilter === projectId) {
      setProjectFilter("all");
      setSelectedIds(new Set(participants.map((participant) => participant.id)));
    }

    if (!supabase) {
      setStatus(project ? `Deleted ${project.name}` : "Deleted project");
      return;
    }

    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    setStatus(error ? error.message : project ? `Deleted ${project.name}` : "Deleted project");
  }

  async function handleToggleProjectMember(
    projectId: string,
    participantId: string,
    checked: boolean,
  ) {
    setProjects((current) =>
      current.map((project) => {
        if (project.id !== projectId) {
          return project;
        }

        const memberIds = new Set(project.memberIds);
        if (checked) {
          memberIds.add(participantId);
        } else {
          memberIds.delete(participantId);
        }

        return { ...project, memberIds: Array.from(memberIds) };
      }),
    );

    if (projectFilter === projectId) {
      setSelectedIds((current) => {
        const next = new Set(current);
        if (checked) {
          next.add(participantId);
        } else {
          next.delete(participantId);
        }
        return next;
      });
    }

    if (!supabase) {
      setStatus("Project membership updated");
      return;
    }

    const result = checked
      ? await supabase
          .from("project_members")
          .upsert({ project_id: projectId, participant_id: participantId })
      : await supabase
          .from("project_members")
          .delete()
          .match({ project_id: projectId, participant_id: participantId });

    setStatus(result.error ? result.error.message : "Project membership updated");
  }

  function handleProjectFilter(projectId: string) {
    setProjectFilter(projectId);
    if (projectId === "custom") {
      return;
    }

    if (projectId === "all") {
      setSelectedIds(new Set(participants.map((participant) => participant.id)));
      return;
    }

    const project = projects.find((item) => item.id === projectId);
    setSelectedIds(new Set(project?.memberIds ?? []));
  }

  function toggleParticipantFilter(participantId: string, checked: boolean) {
    setProjectFilter("custom");
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(participantId);
      } else {
        next.delete(participantId);
      }
      return next;
    });
  }

  const bestSlots = useMemo(() => {
    return DAYS.flatMap((day) =>
      HOURS.map((time) => {
        const key = slotKey(day.key, time.hour, time.minute);
        const strength = slotStrength(key);
        return {
          key,
          label: `${day.label} ${formatTime(time.hour, time.minute)}`,
          ...strength,
        };
      }),
    )
      .filter((slot) => slot.count > 0)
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 5);
  }, [availability, selectedParticipants]);

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-4">
        <header className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white/90 px-5 py-4 shadow-soft backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm">
              <img
                className="h-9 w-9 object-contain"
                src="/Overlap_Logo.png"
                alt="Overlap logo"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-normal text-slate-950 md:text-3xl">
                Overlap
              </h1>
              <div className="mt-1 text-sm font-medium text-teal-700">
                Project-aware group scheduling
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {selectedParticipants.length} of {participants.length} selected
            </span>
            <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <Database className="h-4 w-4 text-teal-700" />
              {isLoading ? "Loading" : status}
            </span>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[320px_minmax(660px,1fr)_320px]">
          <aside className="rounded-lg border border-slate-200 bg-white/95 p-4 shadow-soft">
            <section className="border-b border-slate-200 pb-4">
              <div className="mb-3 flex items-center gap-2">
                <UserRound className="h-5 w-5 text-teal-700" />
                <h2 className="text-base font-semibold text-slate-950">Participant</h2>
              </div>
              <form className="flex gap-2" onSubmit={handleLogin}>
                <input
                  className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  value={nameInput}
                  onChange={(event) => setNameInput(event.target.value)}
                  placeholder="Your name"
                />
                <button
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  type="submit"
                  title="Sign in"
                >
                  <LogIn className="h-4 w-4" />
                </button>
              </form>
              {currentParticipant ? (
                <div className="mt-3 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
                  Editing availability for <strong>{currentParticipant.name}</strong>
                </div>
              ) : null}

              <div className="mt-4 grid grid-cols-2 rounded-md border border-slate-200 bg-slate-100 p-1">
                <button
                  className={classNames(
                    "rounded px-3 py-2 text-sm font-medium transition",
                    mode === "input"
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-600 hover:text-slate-950",
                    !currentParticipant && "cursor-not-allowed opacity-45",
                  )}
                  type="button"
                  disabled={!currentParticipant}
                  onClick={() => setMode("input")}
                >
                  Input
                </button>
                <button
                  className={classNames(
                    "rounded px-3 py-2 text-sm font-medium transition",
                    mode === "group"
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-600 hover:text-slate-950",
                  )}
                  type="button"
                  onClick={() => setMode("group")}
                >
                  Group
                </button>
              </div>
            </section>

            <section className="pt-4">
              <button
                className="flex w-full items-center justify-between rounded-md px-1 py-2 text-left text-base font-semibold text-slate-950 transition hover:bg-slate-50"
                type="button"
                onClick={() => setIsAdminOpen((open) => !open)}
              >
                <span className="inline-flex items-center gap-2">
                  <UsersRound className="h-5 w-5 text-teal-700" />
                  Projects
                </span>
                <ChevronDown
                  className={classNames(
                    "h-4 w-4 text-slate-500 transition",
                    isAdminOpen && "rotate-180",
                  )}
                />
              </button>

              {isAdminOpen ? (
                <div className="mt-3 space-y-4">
                  <form className="flex gap-2" onSubmit={handleCreateProject}>
                    <input
                      className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                      value={projectName}
                      onChange={(event) => setProjectName(event.target.value)}
                      placeholder="Project name"
                    />
                    <button
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-teal-600 text-white transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-200"
                      type="submit"
                      title="Create project"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </form>

                  <div className="space-y-3">
                    {projects.map((project) => (
                      <div
                        className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                        key={project.id}
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <h3 className="min-w-0 truncate text-sm font-semibold text-slate-900">
                            {project.name}
                          </h3>
                          <button
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-rose-50 hover:text-rose-700"
                            type="button"
                            title={`Delete ${project.name}`}
                            onClick={() => void handleDeleteProject(project.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="max-h-44 space-y-1 overflow-auto pr-1">
                          {orderedParticipants.map((participant) => (
                            <label
                              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 transition hover:bg-white"
                              key={`${project.id}-${participant.id}`}
                            >
                              <input
                                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                type="checkbox"
                                checked={project.memberIds.includes(participant.id)}
                                onChange={(event) =>
                                  void handleToggleProjectMember(
                                    project.id,
                                    participant.id,
                                    event.target.checked,
                                  )
                                }
                              />
                              <span className="min-w-0 truncate">{participant.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          </aside>

          <section className="min-w-0 rounded-lg border border-slate-200 bg-white/95 p-4 shadow-soft">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  {mode === "input" && currentParticipant
                    ? `${currentParticipant.name}'s availability`
                    : "Group heatmap"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Monday through Friday, 9:00 AM to 5:00 PM in 30-minute blocks.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {bestSlots.slice(0, 3).map((slot) => (
                  <span
                    className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-800"
                    key={slot.key}
                  >
                    {slot.label}: {slot.count}
                  </span>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[620px]">
                <div className="grid grid-cols-[88px_repeat(5,minmax(96px,1fr))] border-b border-slate-200">
                  <div className="sticky left-0 z-10 bg-white px-2 py-2 text-xs font-semibold uppercase tracking-normal text-slate-400">
                    Time
                  </div>
                  {DAYS.map((day) => {
                    const keys = daySlotKeys(day.key);
                    const isDaySelected =
                      currentParticipant &&
                      keys.every((key) => getParticipantSlots(currentParticipant.id).has(key));

                    return (
                      <button
                        className={classNames(
                          "border-l border-slate-200 px-2 py-2 text-center text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-teal-300",
                          mode === "input" && currentParticipant
                            ? "cursor-pointer text-slate-800 hover:bg-teal-50"
                            : "cursor-default text-slate-800",
                          isDaySelected && "bg-teal-50 text-teal-800",
                        )}
                        key={day.key}
                        type="button"
                        title={
                          mode === "input" && currentParticipant
                            ? `Toggle all ${day.label} slots`
                            : "Sign in and switch to Input mode to select a full day"
                        }
                        onClick={() => toggleDayAvailability(day.key)}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>

                {HOURS.map((time) => (
                  <div
                    className="grid grid-cols-[88px_repeat(5,minmax(96px,1fr))] border-b border-slate-100"
                    key={`${time.hour}-${time.minute}`}
                  >
                    <div className="sticky left-0 z-10 flex min-h-9 items-center bg-white px-2 text-xs font-medium text-slate-500">
                      {formatTime(time.hour, time.minute)}
                    </div>
                    {DAYS.map((day) => {
                      const key = slotKey(day.key, time.hour, time.minute);
                      const strength = slotStrength(key);
                      const userHasSlot = currentParticipant
                        ? getParticipantSlots(currentParticipant.id).has(key)
                        : false;
                      const alpha =
                        mode === "input"
                          ? userHasSlot
                            ? 0.82
                            : 0
                          : strength.count
                            ? 0.14 + strength.ratio * 0.72
                            : 0;

                      return (
                        <button
                          className={classNames(
                            "relative min-h-9 select-none border-l border-slate-100 text-xs font-semibold transition focus:z-20 focus:outline-none focus:ring-2 focus:ring-teal-300",
                            mode === "input" && currentParticipant
                              ? "cursor-cell hover:ring-1 hover:ring-teal-400"
                              : "cursor-default",
                            alpha === 0 && "bg-slate-50 hover:bg-slate-100",
                          )}
                          key={key}
                          type="button"
                          title={
                            strength.names.length
                              ? strength.names.join(", ")
                              : "No selected participants"
                          }
                          style={
                            alpha
                              ? {
                                  backgroundColor: `rgba(16, 185, 129, ${alpha})`,
                                  color: alpha > 0.46 ? "#064e3b" : "#334155",
                                }
                              : undefined
                          }
                          onPointerDown={(event) => handleSlotPointerDown(event, key)}
                          onPointerEnter={() => handleSlotPointerEnter(key)}
                          onMouseEnter={(event) =>
                            setHoveredSlot({
                              slotKey: key,
                              names: strength.names,
                              x: event.clientX,
                              y: event.clientY,
                            })
                          }
                          onMouseMove={(event) =>
                            setHoveredSlot((current) =>
                              current?.slotKey === key
                                ? { ...current, x: event.clientX, y: event.clientY }
                                : current,
                            )
                          }
                          onMouseLeave={() => setHoveredSlot(null)}
                        >
                          {mode === "group" && strength.count ? strength.count : null}
                          {mode === "input" && userHasSlot ? "Free" : null}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <h3 className="mb-2 text-sm font-semibold text-slate-900">Best overlap</h3>
                <div className="space-y-2">
                  {bestSlots.length ? (
                    bestSlots.map((slot) => (
                      <div
                        className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm"
                        key={slot.key}
                      >
                        <span className="truncate text-slate-700">{slot.label}</span>
                        <span className="shrink-0 font-semibold text-emerald-700">
                          {slot.count}/{selectedParticipants.length}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No overlap for the selected group.</p>
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <h3 className="mb-2 text-sm font-semibold text-slate-900">Selected group</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedParticipants.length ? (
                    selectedParticipants.map((participant) => (
                      <span
                        className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-sm text-slate-700"
                        key={participant.id}
                      >
                        {participant.name}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No participants selected.</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <aside className="rounded-lg border border-slate-200 bg-white/95 p-4 shadow-soft">
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Filter className="h-5 w-5 text-teal-700" />
                <h2 className="text-base font-semibold text-slate-950">Filters</h2>
              </div>

              <label className="mb-2 block text-xs font-semibold uppercase tracking-normal text-slate-500">
                Project
              </label>
              <select
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                value={projectFilter}
                onChange={(event) => handleProjectFilter(event.target.value)}
              >
                <option value="all">All participants</option>
                <option value="custom">Custom selection</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>

              <div className="mt-4 flex gap-2">
                <button
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  type="button"
                  onClick={() => {
                    setProjectFilter("all");
                    setSelectedIds(new Set(participants.map((participant) => participant.id)));
                  }}
                >
                  Select all
                </button>
                <button
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  type="button"
                  onClick={() => {
                    setProjectFilter("custom");
                    setSelectedIds(new Set());
                  }}
                >
                  Clear
                </button>
              </div>
            </section>

            <section className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Participants</h3>
                <span className="text-xs text-slate-500">{selectedParticipants.length} active</span>
              </div>
              <div className="max-h-[560px] space-y-1 overflow-auto pr-1">
                {orderedParticipants.map((participant) => {
                  const slotCount = availability[participant.id]?.length ?? 0;

                  return (
                    <label
                      className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm transition hover:bg-slate-50"
                      key={participant.id}
                    >
                      <input
                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        type="checkbox"
                        checked={selectedIds.has(participant.id)}
                        onChange={(event) =>
                          toggleParticipantFilter(participant.id, event.target.checked)
                        }
                      />
                      <span className="min-w-0 flex-1 truncate font-medium text-slate-800">
                        {participant.name}
                      </span>
                      <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-500">
                        {slotCount}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          </aside>
        </div>
      </div>

      {hoveredSlot ? (
        <div
          className="pointer-events-none fixed z-50 max-w-xs rounded-md border border-slate-200 bg-slate-950 px-3 py-2 text-xs text-white shadow-lg"
          style={{ left: hoveredSlot.x + 14, top: hoveredSlot.y + 14 }}
        >
          {hoveredSlot.names.length ? hoveredSlot.names.join(", ") : "No selected participants"}
        </div>
      ) : null}
    </main>
  );
}
