import { useEffect, useMemo, useState } from "react";
import { useListCalorieLogs, useCreateCalorieLog, useDeleteCalorieLog, getListCalorieLogsQueryKey, useGetTodaySummary, getGetTodaySummaryQueryKey, getGetWeeklySummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Flame, Coffee, Sun, Moon, Utensils, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { localDateString } from "@/utils/date";

const optionalNumber = z.preprocess(
  (value) => value === "" ? null : value,
  z.coerce.number().min(0).nullable().optional(),
);

const formSchema = z.object({
  foodName: z.string().min(1, "Food name is required"),
  servings: z.coerce.number().min(0.1, "Serving must be at least 0.1"),
  calories: z.coerce.number().min(0, "Must be non-negative"),
  protein: optionalNumber,
  carbs: optionalNumber,
  fat: optionalNumber,
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
});
type FormValues = z.infer<typeof formSchema>;

const mealIcons = { breakfast: Coffee, lunch: Sun, dinner: Moon, snack: Utensils };
const mealColors: Record<string, string> = {
  breakfast: "hsl(174,65%,38%)",
  lunch: "hsl(215,80%,55%)",
  dinner: "hsl(260,70%,60%)",
  snack: "hsl(25,95%,55%)",
};

const MACRO_COLORS = ["hsl(215,80%,55%)", "hsl(25,95%,55%)", "hsl(0,80%,60%)"];

const NUTRIENT_GUIDES = [
  { label: "Protein", amount: "0.8-1.6g/kg", note: "Higher end supports active days and muscle recovery.", color: "hsl(215,80%,55%)" },
  { label: "Healthy fats", amount: "20-35%", note: "Aim for unsaturated fats from fish, nuts, seeds, and avocado.", color: "hsl(25,95%,55%)" },
  { label: "Carbs", amount: "45-65%", note: "Choose rice, oats, fruits, vegetables, and whole grains.", color: "hsl(174,65%,38%)" },
  { label: "Fiber", amount: "25-38g", note: "Vegetables, fruits, beans, and oats help keep meals filling.", color: "hsl(140,65%,42%)" },
  { label: "Water", amount: "2.7-3.7L", note: "Total daily fluids from drinks and water-rich foods.", color: "hsl(190,85%,42%)" },
  { label: "Sodium", amount: "<2,300mg", note: "Keep salty and highly processed foods moderate.", color: "hsl(0,80%,60%)" },
];

type FoodPreset = {
  label: string;
  keywords: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

const FOOD_PRESETS: FoodPreset[] = [
  { label: "Rice", keywords: ["rice", "kanin"], calories: 205, protein: 4.3, carbs: 44.5, fat: 0.4 },
  { label: "Chicken breast", keywords: ["chicken", "manok"], calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { label: "Egg", keywords: ["egg", "itlog"], calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3 },
  { label: "Banana", keywords: ["banana", "saging"], calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  { label: "Oatmeal", keywords: ["oat", "oatmeal"], calories: 154, protein: 6, carbs: 27, fat: 3 },
  { label: "Bread", keywords: ["bread", "tinapay"], calories: 80, protein: 3, carbs: 15, fat: 1 },
  { label: "Milk", keywords: ["milk", "gatas"], calories: 122, protein: 8, carbs: 12, fat: 4.8 },
  { label: "Coffee", keywords: ["coffee", "kape"], calories: 5, protein: 0.3, carbs: 0, fat: 0 },
  { label: "Soda", keywords: ["soda", "softdrink", "coke"], calories: 140, protein: 0, carbs: 39, fat: 0 },
  { label: "Apple", keywords: ["apple"], calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  { label: "Tuna", keywords: ["tuna"], calories: 132, protein: 28, carbs: 0, fat: 1 },
  { label: "Pork", keywords: ["pork", "baboy"], calories: 242, protein: 27, carbs: 0, fat: 14 },
  { label: "Beef", keywords: ["beef", "baka"], calories: 250, protein: 26, carbs: 0, fat: 15 },
  { label: "Fish", keywords: ["fish", "isda"], calories: 140, protein: 22, carbs: 0, fat: 5 },
  { label: "Salad", keywords: ["salad"], calories: 120, protein: 3, carbs: 12, fat: 7 },
];

function findFoodPreset(foodName: string) {
  const normalized = foodName.toLowerCase();
  return FOOD_PRESETS.find((preset) =>
    preset.keywords.some((keyword) => normalized.includes(keyword)),
  );
}

function scaleNutrition(value: number, servings: number) {
  return Math.round(value * servings * 10) / 10;
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

export default function Calories() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayStr());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: logs, isLoading } = useListCalorieLogs({ date }, { query: { queryKey: getListCalorieLogsQueryKey({ date }) } });
  const { data: summary } = useGetTodaySummary();
  const createMutation = useCreateCalorieLog();
  const deleteMutation = useDeleteCalorieLog();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { foodName: "", servings: 1, calories: 0, mealType: "breakfast", protein: null, carbs: null, fat: null },
  });

  const watchedFoodName = form.watch("foodName");
  const watchedServings = form.watch("servings");
  const matchedPreset = useMemo(
    () => findFoodPreset(watchedFoodName),
    [watchedFoodName],
  );

  useEffect(() => {
    if (!matchedPreset) {
      return;
    }

    const servings = Number(watchedServings) || 1;
    form.setValue("calories", Math.round(matchedPreset.calories * servings), {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("protein", scaleNutrition(matchedPreset.protein, servings), {
      shouldDirty: true,
    });
    form.setValue("carbs", scaleNutrition(matchedPreset.carbs, servings), {
      shouldDirty: true,
    });
    form.setValue("fat", scaleNutrition(matchedPreset.fat, servings), {
      shouldDirty: true,
    });
  }, [form, matchedPreset, watchedServings]);

  const totalCals = (logs ?? []).reduce((acc, l) => acc + l.calories, 0);
  const totalProtein = (logs ?? []).reduce((acc, l) => acc + (l.protein ?? 0), 0);
  const totalCarbs = (logs ?? []).reduce((acc, l) => acc + (l.carbs ?? 0), 0);
  const totalFat = (logs ?? []).reduce((acc, l) => acc + (l.fat ?? 0), 0);

  const macroData = [
    { name: "Protein", value: Math.round(totalProtein) },
    { name: "Carbs", value: Math.round(totalCarbs) },
    { name: "Fats", value: Math.round(totalFat) },
  ].filter(d => d.value > 0);

  const grouped = (logs ?? []).reduce<Record<string, typeof logs>>((acc, l) => {
    if (!acc[l.mealType]) acc[l.mealType] = [];
    acc[l.mealType]!.push(l);
    return acc;
  }, {});

  const calGoal = summary?.calorieGoal ?? 2000;

  async function onSubmit(values: FormValues) {
    const { servings: _servings, ...payload } = values;
    createMutation.mutate(
      { data: { ...payload, loggedAt: loggedAtForDate(date) } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCalorieLogsQueryKey({ date }) });
          queryClient.invalidateQueries({ queryKey: getGetTodaySummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetWeeklySummaryQueryKey() });
          toast({ title: "Food logged", description: `${values.foodName} added.` });
          form.reset({ foodName: "", servings: 1, calories: 0, mealType: "breakfast", protein: null, carbs: null, fat: null });
          setOpen(false);
        },
        onError: () => toast({ title: "Error", description: "Failed to log food.", variant: "destructive" }),
      }
    );
  }

  function handleDelete(id: number) {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCalorieLogsQueryKey({ date }) });
        queryClient.invalidateQueries({ queryKey: getGetTodaySummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetWeeklySummaryQueryKey() });
        toast({ title: "Removed" });
      },
    });
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Nutrition Tracker</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button
              data-testid="button-add-food"
              className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:opacity-90 transition-opacity"
            >
              <Plus className="w-5 h-5" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Log Food</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
                <FormField control={form.control} name="foodName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Food name</FormLabel>
                    <FormControl>
                      <Input
                        data-testid="input-food-name"
                        placeholder="e.g. Rice, chicken, coffee"
                        list="food-presets"
                        {...field}
                      />
                    </FormControl>
                    <datalist id="food-presets">
                      {FOOD_PRESETS.map((preset) => (
                        <option key={preset.label} value={preset.label} />
                      ))}
                    </datalist>
                    <p className="text-xs text-muted-foreground">
                      {matchedPreset
                        ? `Matched ${matchedPreset.label}. Calories and macros update per serving.`
                        : "Known foods and drinks auto-fill calories; unknown items can be entered manually."}
                    </p>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="servings" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Servings</FormLabel>
                      <FormControl><Input data-testid="input-servings" type="number" min={0.1} step="0.1" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="calories" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calories</FormLabel>
                      <FormControl><Input data-testid="input-calories" type="number" min={0} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="mealType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meal</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-meal-type"><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="breakfast">Breakfast</SelectItem>
                          <SelectItem value="lunch">Lunch</SelectItem>
                          <SelectItem value="dinner">Dinner</SelectItem>
                          <SelectItem value="snack">Snack</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <FormField control={form.control} name="protein" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Protein (g)</FormLabel>
                      <FormControl><Input data-testid="input-protein" type="number" min={0} step="0.1" placeholder="0" {...field} value={field.value ?? ""} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="carbs" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Carbs (g)</FormLabel>
                      <FormControl><Input data-testid="input-carbs" type="number" min={0} step="0.1" placeholder="0" {...field} value={field.value ?? ""} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="fat" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fat (g)</FormLabel>
                      <FormControl><Input data-testid="input-fat" type="number" min={0} step="0.1" placeholder="0" {...field} value={field.value ?? ""} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <Button data-testid="button-submit-food" type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Saving..." : "Log Food"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Date picker */}
      <div className="flex items-center gap-3 mb-5">
        <Label className="text-sm text-muted-foreground">Date:</Label>
        <Input data-testid="input-date-filter" type="date" value={date} onChange={e => setDate(e.target.value)} className="w-40" />
      </div>

      <div className="mb-5 overflow-hidden rounded-2xl border border-card-border bg-card shadow-sm">
        <div className="bg-[linear-gradient(135deg,hsl(174,65%,38%),hsl(215,80%,55%))] px-5 py-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/75">Daily nutrition guide</p>
          <h2 className="mt-1 text-lg font-display font-bold">Healthy suggested amounts</h2>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {NUTRIENT_GUIDES.map((item) => (
            <div key={item.label} className="rounded-xl border border-border/60 bg-secondary/35 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-foreground">{item.label}</span>
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-bold text-white"
                  style={{ background: item.color }}
                >
                  {item.amount}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Macros card */}
      <div className="bg-card rounded-2xl border border-card-border p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Macros</h2>
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4" style={{ color: "hsl(25,95%,55%)" }} />
            <span className="text-sm font-bold text-foreground">{totalCals.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">/ {calGoal.toLocaleString()} kcal</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="shrink-0">
            {macroData.length > 0 ? (
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={macroData} cx={55} cy={55} innerRadius={32} outerRadius={52} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {macroData.map((_, i) => <Cell key={i} fill={MACRO_COLORS[i % MACRO_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v}g`]} contentStyle={{ borderRadius: "8px", fontSize: "11px", border: "1px solid hsl(185,20%,88%)" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-[120px] h-[120px] rounded-full border-8 border-muted flex items-center justify-center">
                <span className="text-xs text-muted-foreground text-center">No data</span>
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2.5">
            {[
              { label: "Protein", value: totalProtein, color: MACRO_COLORS[0] },
              { label: "Carbs", value: totalCarbs, color: MACRO_COLORS[1] },
              { label: "Fats", value: totalFat, color: MACRO_COLORS[2] },
            ].map(m => (
              <div key={m.label} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: m.color }} />
                <span className="text-xs text-muted-foreground w-14">{m.label}</span>
                <span className="text-xs font-semibold text-foreground">{Math.round(m.value)}g</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Meals Today */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Meals for selected date
        </h2>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : (Object.keys(grouped).length === 0) ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-card-border">
            <Flame className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">No meals logged yet</p>
            <p className="text-muted-foreground text-sm mt-1">Tap + to log your first meal</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-card-border overflow-hidden divide-y divide-border">
            {(["breakfast", "lunch", "dinner", "snack"] as const).map(meal => {
              const items = grouped[meal];
              if (!items || items.length === 0) return null;
              const Icon = mealIcons[meal];
              const mealTotal = items.reduce((a, l) => a + l.calories, 0);
              return (
                <div key={meal}>
                  <div className="flex items-center gap-3 px-5 py-3 bg-secondary/40">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${mealColors[meal]}20` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: mealColors[meal] }} />
                    </div>
                    <span className="font-semibold text-sm text-foreground capitalize">{meal}</span>
                    <span className="ml-auto text-xs font-medium text-muted-foreground">{mealTotal} kcal</span>
                  </div>
                  <ul>
                    {items.map(log => (
                      <li key={log.id} data-testid={`calorie-entry-${log.id}`} className="flex items-center gap-3 px-5 py-3 border-t border-border/50 hover:bg-secondary/20 transition-colors group">
                        <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center font-display font-bold text-sm text-white"
                          style={{ background: mealColors[meal] }}>
                          {log.foodName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{log.foodName}</p>
                          {(log.protein != null || log.carbs != null || log.fat != null) && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {log.protein != null ? `P:${log.protein}g ` : ""}
                              {log.carbs != null ? `C:${log.carbs}g ` : ""}
                              {log.fat != null ? `F:${log.fat}g` : ""}
                            </p>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-foreground">{log.calories} kcal</span>
                        <button
                          data-testid={`button-delete-calorie-${log.id}`}
                          onClick={() => handleDelete(log.id)}
                          className="p-1.5 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
