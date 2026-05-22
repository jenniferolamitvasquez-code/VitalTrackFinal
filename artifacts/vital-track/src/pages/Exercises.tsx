import { useEffect, useMemo, useState } from "react";
import { useListExercises, useCreateExercise, useDeleteExercise, getListExercisesQueryKey, getGetTodaySummaryQueryKey, getGetWeeklySummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Pause, Play, Plus, Square, Trash2, Dumbbell, Timer, Flame, Wind, Smile, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { localDateString } from "@/utils/date";

const optionalNumber = z.preprocess(
  (value) => value === "" ? null : value,
  z.coerce.number().min(0).nullable().optional(),
);

const blankAsZero = z.preprocess(
  (value) => value === "" || value == null ? 0 : value,
  z.coerce.number().min(0),
);

const requiredNumber = z.preprocess(
  (value) => value === "" || value == null ? undefined : value,
  z.coerce.number({ message: "This field is required" }),
);

const exerciseCategorySchema = z.enum([
  "cardio",
  "strength",
  "flexibility",
  "other",
]);

const formSchema = z.object({
  name: z.string().min(1, "Exercise name is required"),
  category: exerciseCategorySchema,
  durationHours: blankAsZero.pipe(z.number().max(24)),
  durationMinutesPart: blankAsZero.pipe(z.number().max(59)),
  bodyWeightKg: requiredNumber.pipe(z.number().min(20).max(300)),
  caloriesBurned: optionalNumber,
  notes: z.string().optional().nullable(),
}).superRefine((value, ctx) => {
  if (durationToMinutes(value.durationHours, value.durationMinutesPart) < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Duration must be at least 1 minute",
      path: ["durationMinutesPart"],
    });
  }
});
type FormValues = z.infer<typeof formSchema>;

function durationToMinutes(hours?: number, minutes?: number) {
  return Math.max(0, Math.round((Number(hours) || 0) * 60 + (Number(minutes) || 0)));
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours <= 0) {
    return `${mins} min`;
  }

  return `${hours} hr${hours > 1 ? "s" : ""}${mins ? ` ${mins} min` : ""}`;
}

function todayStr() {
  return localDateString();
}

function loggedAtForDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);

  return dateStr === todayStr()
    ? new Date().toISOString()
    : new Date(year, month - 1, day, 12).toISOString();
}

const CATEGORIES = [
  { key: "all", label: "All", icon: Trophy },
  { key: "cardio", label: "Cardio", icon: Wind },
  { key: "strength", label: "Strength", icon: Dumbbell },
  { key: "flexibility", label: "Flexibility", icon: Smile },
] as const;

const categoryConfig: Record<string, { color: string; bg: string; badge: string }> = {
  cardio:      { color: "hsl(174,65%,38%)",  bg: "hsl(174,65%,92%)",  badge: "hsl(174,65%,38%)" },
  strength:    { color: "hsl(260,70%,60%)",  bg: "hsl(260,70%,93%)",  badge: "hsl(260,70%,60%)" },
  flexibility: { color: "hsl(140,65%,42%)",  bg: "hsl(140,65%,92%)",  badge: "hsl(140,65%,42%)" },
  other:       { color: "hsl(210,15%,50%)",  bg: "hsl(210,15%,92%)",  badge: "hsl(210,15%,50%)" },
};

const difficultyColor: Record<string, string> = {
  cardio: "hsl(25,95%,55%)",
  strength: "hsl(0,80%,60%)",
  flexibility: "hsl(140,65%,42%)",
  other: "hsl(210,15%,50%)",
};

type ExerciseCategory = z.infer<typeof exerciseCategorySchema>;

const MET_BY_CATEGORY: Record<ExerciseCategory, number> = {
  cardio: 8,
  strength: 5,
  flexibility: 2.5,
  other: 4,
};

const EXERCISE_MET_OVERRIDES: Array<{ match: RegExp; met: number; category: ExerciseCategory }> = [
  { match: /run|jog|sprint/i, met: 9.8, category: "cardio" },
  { match: /walk|walking/i, met: 3.8, category: "cardio" },
  { match: /bike|cycling|cycle/i, met: 7.5, category: "cardio" },
  { match: /swim|swimming/i, met: 8.3, category: "cardio" },
  { match: /basketball|football|soccer|tennis|badminton/i, met: 7, category: "cardio" },
  { match: /weight|lift|lifting|bench|squat|deadlift|dumbbell/i, met: 5, category: "strength" },
  { match: /hiit|crossfit|burpee/i, met: 10, category: "cardio" },
  { match: /yoga|stretch|pilates/i, met: 2.8, category: "flexibility" },
  { match: /dance|zumba/i, met: 6.5, category: "cardio" },
];

const WORKOUT_VIDEOS = {
  cardio30: "https://www.youtube.com/embed/DVD_gIdPr-o",
  cardio60: "https://www.youtube.com/embed/HQ007yrHrLs",
  strength30: "https://www.youtube.com/embed/0hYDDsRjwks",
  strength60: "https://www.youtube.com/embed/rWearms3rFY",
  flexibility30: "https://www.youtube.com/embed/0h7taISrO7c",
  flexibility60: "https://www.youtube.com/embed/HBN7bEK73Qc",
};

const AVAILABLE_EXERCISES: Array<{
  name: string;
  category: ExerciseCategory;
  met: number;
  detail: string;
  videoUrl: string;
}> = [
  { name: "Cardio Workout - 30 mins", category: "cardio", met: 8, detail: "Provided 30-minute cardio session", videoUrl: WORKOUT_VIDEOS.cardio30 },
  { name: "Cardio Workout - 1 hr", category: "cardio", met: 8, detail: "Provided 1-hour cardio session", videoUrl: WORKOUT_VIDEOS.cardio60 },
  { name: "Strength Workout - 30 mins", category: "strength", met: 5, detail: "Provided 30-minute strength session", videoUrl: WORKOUT_VIDEOS.strength30 },
  { name: "Strength Workout - 1 hr", category: "strength", met: 5, detail: "Provided 1-hour strength session", videoUrl: WORKOUT_VIDEOS.strength60 },
  { name: "Flexibility Workout - 30 mins", category: "flexibility", met: 2.5, detail: "Provided 30-minute flexibility session", videoUrl: WORKOUT_VIDEOS.flexibility30 },
  { name: "Flexibility Workout - 1 hr", category: "flexibility", met: 2.5, detail: "Provided 1-hour flexibility session", videoUrl: WORKOUT_VIDEOS.flexibility60 },
];

function estimateExerciseCalories({
  name,
  category,
  durationHours,
  durationMinutesPart,
  bodyWeightKg,
}: {
  name?: string;
  category?: ExerciseCategory;
  durationHours?: number;
  durationMinutesPart?: number;
  bodyWeightKg?: number;
}) {
  const cleanDuration = durationToMinutes(durationHours, durationMinutesPart);
  const bodyWeight = Number(bodyWeightKg);
  if (!name || !category || cleanDuration < 1 || !bodyWeight || bodyWeight < 20) {
    return null;
  }

  const override = EXERCISE_MET_OVERRIDES.find((item) => item.match.test(name));
  const met = override?.met ?? MET_BY_CATEGORY[category] ?? MET_BY_CATEGORY.other;

  return Math.max(0, Math.round((met * 3.5 * bodyWeight * cleanDuration) / 200));
}

function suggestedCategory(name: string) {
  return EXERCISE_MET_OVERRIDES.find((item) => item.match.test(name))?.category;
}

function caloriesFromMet(met: number, bodyWeightKg: number, durationMinutes: number) {
  return Math.max(0, Math.round((met * 3.5 * bodyWeightKg * durationMinutes) / 200));
}

function formatSessionClock(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

type ActiveWorkoutSession = {
  name: string;
  category: ExerciseCategory;
  durationMinutes: number;
  totalSeconds: number;
  targetCalories: number;
  videoUrl: string;
};

export default function Exercises() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [workoutCategory, setWorkoutCategory] = useState<ExerciseCategory | "">("");
  const [workoutHours, setWorkoutHours] = useState("");
  const [workoutMinutes, setWorkoutMinutes] = useState("");
  const [workoutBodyWeight, setWorkoutBodyWeight] = useState("");
  const [activeSession, setActiveSession] = useState<ActiveWorkoutSession | null>(null);
  const [sessionStatus, setSessionStatus] = useState<"running" | "paused">("running");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: logs, isLoading } = useListExercises({ date }, { query: { queryKey: getListExercisesQueryKey({ date }) } });
  const createMutation = useCreateExercise();
  const deleteMutation = useDeleteExercise();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: undefined,
      durationHours: undefined,
      durationMinutesPart: undefined,
      bodyWeightKg: undefined,
      caloriesBurned: null,
      notes: null,
    },
  });

  const category = form.watch("category");
  const watchedName = form.watch("name");
  const watchedDurationHours = form.watch("durationHours");
  const watchedDurationMinutes = form.watch("durationMinutesPart");
  const watchedBodyWeight = form.watch("bodyWeightKg");

  const estimatedCalories = useMemo(
    () =>
      estimateExerciseCalories({
        name: watchedName,
        category,
        durationHours: watchedDurationHours,
        durationMinutesPart: watchedDurationMinutes,
        bodyWeightKg: watchedBodyWeight,
      }),
    [category, watchedBodyWeight, watchedDurationHours, watchedDurationMinutes, watchedName],
  );

  useEffect(() => {
    if (estimatedCalories == null) {
      form.setValue("caloriesBurned", null, {
        shouldDirty: true,
        shouldValidate: true,
      });
      return;
    }

    form.setValue("caloriesBurned", estimatedCalories, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [estimatedCalories, form]);

  useEffect(() => {
    const nextCategory = suggestedCategory(watchedName);
    if (nextCategory && nextCategory !== category) {
      form.setValue("category", nextCategory, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [category, form, watchedName]);

  const totalMinutes = (logs ?? []).reduce((acc, l) => acc + l.durationMinutes, 0);
  const totalCalsBurned = (logs ?? []).reduce((acc, l) => acc + (l.caloriesBurned ?? 0), 0);

  const filtered = (logs ?? []).filter(l => activeCategory === "all" || l.category === activeCategory);
  const plannedDurationMinutes = durationToMinutes(
    Number(workoutHours) || 0,
    Number(workoutMinutes) || 0,
  );
  const plannedBodyWeight = Number(workoutBodyWeight);
  const availableExercises = AVAILABLE_EXERCISES.filter(
    (exercise) => exercise.category === workoutCategory,
  );
  const activeCalories = activeSession
    ? Math.min(
        activeSession.targetCalories,
        Math.round(
          activeSession.targetCalories *
            Math.min(elapsedSeconds / activeSession.totalSeconds, 1),
        ),
      )
    : 0;
  const activeProgress = activeSession
    ? Math.min(Math.round((elapsedSeconds / activeSession.totalSeconds) * 100), 100)
    : 0;
  const activeRemaining = activeSession
    ? Math.max(activeSession.totalSeconds - elapsedSeconds, 0)
    : 0;

  useEffect(() => {
    if (!activeSession || sessionStatus !== "running") {
      return;
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds((current) =>
        Math.min(current + 1, activeSession.totalSeconds),
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeSession, sessionStatus]);

  useEffect(() => {
    if (!activeSession || elapsedSeconds < activeSession.totalSeconds) {
      return;
    }

    completeActiveWorkout(activeSession);
  }, [activeSession, elapsedSeconds]);

  function invalidateExerciseData() {
    queryClient.invalidateQueries({ queryKey: getListExercisesQueryKey({ date }) });
    queryClient.invalidateQueries({ queryKey: getGetTodaySummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetWeeklySummaryQueryKey() });
  }

  function startGuidedWorkout(exercise: (typeof AVAILABLE_EXERCISES)[number]) {
    if (!workoutCategory || plannedDurationMinutes < 1) {
      toast({
        title: "Set workout duration",
        description: "Choose a category and enter hours or minutes first.",
        variant: "destructive",
      });
      return;
    }

    if (!plannedBodyWeight || plannedBodyWeight < 20) {
      toast({
        title: "Body weight needed",
        description: "Enter body weight for a more accurate calorie count.",
        variant: "destructive",
      });
      return;
    }

    const targetCalories = caloriesFromMet(
      exercise.met,
      plannedBodyWeight,
      plannedDurationMinutes,
    );

    setElapsedSeconds(0);
    setSessionStatus("running");
    setActiveSession({
      name: exercise.name,
      category: exercise.category,
      durationMinutes: plannedDurationMinutes,
      totalSeconds: plannedDurationMinutes * 60,
      targetCalories,
      videoUrl: exercise.videoUrl,
    });
  }

  function pauseWorkout() {
    setSessionStatus("paused");
  }

  function resumeWorkout() {
    setSessionStatus("running");
  }

  function stopWorkout() {
    setActiveSession(null);
    setElapsedSeconds(0);
    setSessionStatus("running");
    toast({ title: "Workout stopped" });
  }

  function completeActiveWorkout(session: ActiveWorkoutSession) {
    if (createMutation.isPending) {
      return;
    }

    createMutation.mutate(
      {
        data: {
          name: session.name,
          category: session.category,
          durationMinutes: session.durationMinutes,
          caloriesBurned: session.targetCalories,
          loggedAt: loggedAtForDate(date),
          notes: "Completed guided workout session.",
        },
      },
      {
        onSuccess: () => {
          invalidateExerciseData();
          setActiveSession(null);
          setElapsedSeconds(0);
          setSessionStatus("running");
          toast({
            title: "Workout successfully done",
            description: `${session.name} completed. ${session.targetCalories.toLocaleString()} kcal burned.`,
          });
        },
        onError: () =>
          toast({
            title: "Error",
            description: "Workout finished but failed to save.",
            variant: "destructive",
          }),
      },
    );
  }

  async function onSubmit(values: FormValues) {
    const { durationHours, durationMinutesPart, bodyWeightKg: _bodyWeightKg, ...apiValues } = values;
    const durationMinutes = durationToMinutes(durationHours, durationMinutesPart);

    createMutation.mutate(
      { data: { ...apiValues, durationMinutes, loggedAt: loggedAtForDate(date) } },
      {
        onSuccess: () => {
          invalidateExerciseData();
          toast({ title: "Exercise logged", description: `${values.name} added.` });
          form.reset({
            name: "",
            category: undefined,
            durationHours: undefined,
            durationMinutesPart: undefined,
            bodyWeightKg: undefined,
            caloriesBurned: null,
            notes: null,
          });
          setOpen(false);
        },
        onError: () => toast({ title: "Error", description: "Failed to log exercise.", variant: "destructive" }),
      }
    );
  }

  function handleDelete(id: number) {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        invalidateExerciseData();
        toast({ title: "Removed" });
      },
    });
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Workout Library</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Log and track your workouts</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button
              data-testid="button-add-exercise"
              className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:opacity-90 transition-opacity"
            >
              <Plus className="w-5 h-5" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Log Exercise</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exercise name</FormLabel>
                    <FormControl><Input data-testid="input-exercise-name" placeholder="e.g. Morning Run" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-exercise-category"><SelectValue placeholder="Select" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cardio">Cardio</SelectItem>
                          <SelectItem value="strength">Strength</SelectItem>
                          <SelectItem value="flexibility">Flexibility</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="durationHours" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hours</FormLabel>
                        <FormControl><Input data-testid="input-duration-hours" type="number" min={0} max={24} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="durationMinutesPart" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minutes</FormLabel>
                        <FormControl><Input data-testid="input-duration-minutes" type="number" min={0} max={59} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
                <FormField control={form.control} name="bodyWeightKg" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Body weight (kg)</FormLabel>
                    <FormControl><Input data-testid="input-body-weight" type="number" min={20} max={300} step="0.1" {...field} /></FormControl>
                    <p className="text-xs text-muted-foreground">
                      Used only for a more accurate calorie estimate.
                    </p>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="caloriesBurned" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calories burned</FormLabel>
                    <FormControl><Input data-testid="input-exercise-calories" type="number" min={0} placeholder="0" {...field} value={field.value ?? ""} /></FormControl>
                    <p className="text-xs text-muted-foreground">
                      Auto-estimated from exercise type, MET value, duration, and body weight.
                    </p>
                  </FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl><Textarea data-testid="input-exercise-notes" placeholder="Any notes..." rows={2} {...field} value={field.value ?? ""} /></FormControl>
                  </FormItem>
                )} />
                <Button data-testid="button-submit-exercise" type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Saving..." : "Log Exercise"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Date + summary */}
      <div className="flex items-center gap-3 mb-5">
        <Label className="text-sm text-muted-foreground">Date:</Label>
        <Input data-testid="input-date-filter-exercises" type="date" value={date} onChange={e => setDate(e.target.value)} className="w-40" />
        <div className="ml-auto flex gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Timer className="w-4 h-4" style={{ color: "hsl(174,65%,38%)" }} />
            <span className="font-bold text-foreground">{formatDuration(totalMinutes)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-calories" />
            <span className="font-bold text-foreground">{totalCalsBurned}</span>
            <span className="text-muted-foreground">kcal</span>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-card-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Guided workout
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a category and duration, then choose an exercise to start live calorie tracking.
            </p>
          </div>
          {activeSession && (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              In progress
            </span>
          )}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1.15fr_0.7fr_0.7fr_0.9fr]">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={workoutCategory}
              onValueChange={(value: ExerciseCategory) => setWorkoutCategory(value)}
              disabled={Boolean(activeSession)}
            >
              <SelectTrigger data-testid="select-guided-category">
                <SelectValue placeholder="Choose workout type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cardio">Cardio</SelectItem>
                <SelectItem value="strength">Strength</SelectItem>
                <SelectItem value="flexibility">Flexibility</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Hours</Label>
            <Input
              data-testid="input-guided-hours"
              type="number"
              min={0}
              max={24}
              value={workoutHours}
              onChange={(event) => setWorkoutHours(event.target.value)}
              disabled={Boolean(activeSession)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label>Minutes</Label>
            <Input
              data-testid="input-guided-minutes"
              type="number"
              min={0}
              max={59}
              value={workoutMinutes}
              onChange={(event) => setWorkoutMinutes(event.target.value)}
              disabled={Boolean(activeSession)}
              placeholder="30"
            />
          </div>
          <div className="space-y-2">
            <Label>Body weight (kg)</Label>
            <Input
              data-testid="input-guided-weight"
              type="number"
              min={20}
              max={300}
              step="0.1"
              value={workoutBodyWeight}
              onChange={(event) => setWorkoutBodyWeight(event.target.value)}
              disabled={Boolean(activeSession)}
              placeholder="e.g. 70"
            />
          </div>
        </div>

        {activeSession ? (
          <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="overflow-hidden rounded-2xl border border-border bg-black">
                <iframe
                  key={activeSession.videoUrl}
                  src={activeSession.videoUrl}
                  title={activeSession.name}
                  className="aspect-video h-full w-full object-contain"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>

              <div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {activeSession.name}
                    </p>
                    <span className="rounded-full bg-background px-2.5 py-1 text-xs font-semibold text-primary">
                      {sessionStatus === "paused" ? "Paused" : "Running"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Target: {formatDuration(activeSession.durationMinutes)} ·{" "}
                    {activeSession.targetCalories.toLocaleString()} kcal
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-background px-3 py-2">
                    <p className="text-xs text-muted-foreground">Elapsed</p>
                    <p className="font-display text-base font-bold">
                      {formatSessionClock(elapsedSeconds)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-background px-3 py-2">
                    <p className="text-xs text-muted-foreground">Left</p>
                    <p className="font-display text-base font-bold">
                      {formatSessionClock(activeRemaining)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-background px-3 py-2">
                    <p className="text-xs text-muted-foreground">Burned</p>
                    <p className="font-display text-base font-bold text-primary">
                      {activeCalories}
                    </p>
                  </div>
                </div>
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${activeProgress}%` }}
                  />
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                  {sessionStatus === "running" ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={pauseWorkout}
                      className="rounded-xl"
                    >
                      <Pause className="h-4 w-4" />
                      Pause
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={resumeWorkout}
                      className="rounded-xl"
                    >
                      <Play className="h-4 w-4" />
                      Resume
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={stopWorkout}
                    className="rounded-xl"
                  >
                    <Square className="h-4 w-4" />
                    Stop
                  </Button>
                  <Button
                    type="button"
                    onClick={() => completeActiveWorkout(activeSession)}
                    disabled={createMutation.isPending}
                    className="rounded-xl"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Finish now
                  </Button>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Pause/resume controls the workout counter. Use the video player controls for playback.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">
                Available exercises
              </h3>
              <span className="text-xs text-muted-foreground">
                {plannedDurationMinutes > 0
                  ? `Duration: ${formatDuration(plannedDurationMinutes)}`
                  : "Enter duration first"}
              </span>
            </div>
            {!workoutCategory ? (
              <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                Choose a workout category to show available exercises.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {availableExercises.map((exercise) => {
                  const cfg = categoryConfig[exercise.category] ?? categoryConfig.other;
                  const estimated =
                    plannedDurationMinutes > 0 && plannedBodyWeight >= 20
                      ? caloriesFromMet(
                          exercise.met,
                          plannedBodyWeight,
                          plannedDurationMinutes,
                        )
                      : null;

                  return (
                    <div
                      key={exercise.name}
                      className="rounded-2xl border border-border bg-background p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                          style={{ backgroundColor: cfg.bg, color: cfg.color }}
                        >
                          <Dumbbell className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground">
                            {exercise.name}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {exercise.detail}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span>MET {exercise.met}</span>
                            <span>{formatDuration(plannedDurationMinutes)}</span>
                            <span>
                              {estimated != null
                                ? `${estimated.toLocaleString()} kcal`
                                : "Calories after weight"}
                            </span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => startGuidedWorkout(exercise)}
                          disabled={
                            plannedDurationMinutes < 1 ||
                            plannedBodyWeight < 20 ||
                            createMutation.isPending
                          }
                          className="rounded-xl"
                        >
                          <Play className="h-4 w-4" />
                          Start
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {CATEGORIES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 border",
              activeCategory === key
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card text-muted-foreground border-card-border hover:border-primary/30 hover:text-foreground"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Exercise list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-card-border">
          <Dumbbell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium">No exercises logged</p>
          <p className="text-muted-foreground text-sm mt-1">Tap + to log your first workout</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(log => {
            const cfg = categoryConfig[log.category] ?? categoryConfig.other;
            return (
              <div
                key={log.id}
                data-testid={`exercise-entry-${log.id}`}
                className="bg-card rounded-2xl border border-card-border overflow-hidden hover:shadow-md transition-shadow group"
              >
                <div className="flex items-stretch">
                  {/* Color stripe */}
                  <div className="w-1.5 shrink-0" style={{ background: cfg.color }} />
                  <div className="flex items-center gap-4 flex-1 p-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                      <Dumbbell className="w-5 h-5" style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-semibold text-foreground">{log.name}</p>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide text-white"
                          style={{ background: difficultyColor[log.category] ?? "hsl(210,15%,50%)" }}
                        >
                          {log.category}
                        </span>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Timer className="w-3 h-3" />{formatDuration(log.durationMinutes)}
                        </span>
                        {log.caloriesBurned != null && (
                          <span className="flex items-center gap-1">
                            <Flame className="w-3 h-3" />{log.caloriesBurned} kcal
                          </span>
                        )}
                      </div>
                      {log.notes && <p className="text-xs text-muted-foreground mt-1 italic">{log.notes}</p>}
                    </div>
                    <button
                      data-testid={`button-delete-exercise-${log.id}`}
                      onClick={() => handleDelete(log.id)}
                      className="p-2 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
