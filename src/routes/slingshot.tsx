import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Home, Users, Github } from "lucide-react";
import { useCurrentPeriod, useSaveSlingshotEntry, useSlingshotEntries, calculateSlingshotPoints, SLINGSHOT_POINTS, type SlingshotActivityKey } from "@/lib/slingshot/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/slingshot")({
  head: () => ({
    meta: [
      { title: "Operation Slingshot — SvS Prep Scheduler" },
      { name: "description", content: "Track Day 5: Power Boost activity submissions" },
    ],
  }),
  component: SlingshotPage,
});

function SlingshotPage() {
  const [activeTab, setActiveTab] = useState<"entry" | "subscribers">("entry");

  return (
    <div className="min-h-screen bg-ink text-fg">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-panel border-b border-line">
        <div className="px-4 py-4 border-b border-line flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="size-10 grid place-items-center bg-primary text-primary-foreground font-bold text-sm">
              3496
            </div>
            <div className="leading-none">
              <p className="font-semibold text-[16px] tracking-tight">SvS Preparation</p>
              <p className="text-[12px] font-mono text-mut mt-1.5">Operation Slingshot</p>
            </div>
          </div>

          {/* Total Points (middle) */}
          {activeTab === "subscribers" && (
            <div className="flex-1 text-center">
              <SlingshotTotal />
            </div>
          )}

          {/* GitHub repository */}
          <div>
            <a
              href="https://github.com/GaboMendez/WOS-SvS-Manager"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs font-medium text-mut hover:text-fg transition-colors"
            >
              <Github className="size-3.5" />
              GitHub repository
            </a>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === "entry" ? <PlayerEntryForm onSaved={() => setActiveTab("subscribers")} /> : <SubscribersList onSelectPlayer={() => {}} />}
      </div>

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-panel border-t border-line">
        <div className="flex">
          <button
            onClick={() => setActiveTab("entry")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === "entry"
                ? "text-primary bg-primary/10"
                : "text-mut hover:text-fg"
            }`}
          >
            <Home className="size-4" />
            Player Entry
          </button>
          <div className="w-px bg-line" />
          <button
            onClick={() => setActiveTab("subscribers")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === "subscribers"
                ? "text-primary bg-primary/10"
                : "text-mut hover:text-fg"
            }`}
          >
            <Users className="size-4" />
            Subscribers
          </button>
        </div>
      </div>

      {/* Spacer for bottom tabs */}
      <div className="h-20" />
    </div>
  );
}

function SlingshotTotal() {
  const entries = useSlingshotEntries();
  const total = entries.data?.reduce((sum, e) => sum + e.total_points, 0) ?? 0;

  return (
    <span className="text-sm -ml-20">
      <span className="text-mut">Total: </span>
      <span className="font-mono font-semibold text-primary">{total.toLocaleString()}</span>
    </span>
  );
}

interface ActivityInputProps {
  label: string;
  value: number;
  pointsPerUnit: number;
  onChange: (value: number) => void;
  unit?: string;
}

function ActivityInput({ label, value, pointsPerUnit, onChange, unit }: ActivityInputProps) {
  const handleDecrement = () => {
    if (value > 0) onChange(value - 1);
  };

  const handleIncrement = () => {
    onChange(value + 1);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 0) {
      onChange(val);
    } else if (e.target.value === "") {
      onChange(0);
    }
  };

  const pointsEarned = value * pointsPerUnit;

  return (
    <div className="rounded-md ring-1 ring-line bg-panel2 p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium leading-tight">{label}</p>
        <p className="font-mono text-xs text-mut whitespace-nowrap">
          {pointsPerUnit.toLocaleString()} pts{unit ? ` / ${unit}` : ""}
        </p>
      </div>
      <div className="flex items-center justify-between mt-auto">
        <div>
          <p className="font-mono text-lg font-semibold text-primary">{pointsEarned.toLocaleString()}</p>
          <p className="font-mono text-[10px] text-mut">points</p>
        </div>
        <div className="flex items-center">
          <button
            onClick={handleDecrement}
            disabled={value === 0}
            className="w-8 h-8 flex items-center justify-center rounded-l-md bg-panel border border-line text-fg hover:bg-panel2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            −
          </button>
          <input
            type="text"
            value={value}
            onChange={handleChange}
            className="w-16 h-8 text-center bg-panel border-y border-line text-sm font-mono [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            onClick={handleIncrement}
            className="w-8 h-8 flex items-center justify-center rounded-r-md bg-panel border border-line text-fg hover:bg-panel2"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

function PlayerEntryForm({ onSaved }: { onSaved: () => void }) {
  const currentPeriod = useCurrentPeriod();
  const saveEntry = useSaveSlingshotEntry();

  const [playerName, setPlayerName] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [activities, setActivities] = useState<Record<SlingshotActivityKey, number>>({
    pet_advancement: 0,
    advanced_wild_mark: 0,
    common_wild_mark: 0,
    chief_gear_score: 0,
    hero_gear_essence_stone: 0,
    hero_exclusive_gear_widget: 0,
    mithril: 0,
    fire_crystal: 0,
    construction_speedup_minutes: 0,
    research_speedup_minutes: 0,
    training_speedup_minutes: 0,
    expert_skills_speedup_minutes: 0,
    fire_crystal_shard: 0,
    refined_fire_crystal: 0,
  });

  const totalPoints = calculateSlingshotPoints(activities);

  const handleActivityChange = (key: SlingshotActivityKey, value: number) => {
    setActivities((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!playerName.trim()) {
      toast.error("Player name is required");
      return;
    }

    if (!playerId.trim()) {
      toast.error("Player ID is required");
      return;
    }

    if (!currentPeriod.data?.id) {
      toast.error("No active period. Please create a period first.");
      return;
    }

    try {
      await saveEntry.mutateAsync({
        id: crypto.randomUUID(),
        player_id: playerId.trim(),
        player_name: playerName.trim(),
        ...activities,
        total_points: totalPoints,
      });
      toast.success("Player saved successfully!");
      // Reset form
      setPlayerName("");
      setPlayerId("");
      setActivities({
        pet_advancement: 0,
        advanced_wild_mark: 0,
        common_wild_mark: 0,
        chief_gear_score: 0,
        hero_gear_essence_stone: 0,
        hero_exclusive_gear_widget: 0,
        mithril: 0,
        fire_crystal: 0,
        construction_speedup_minutes: 0,
        research_speedup_minutes: 0,
        training_speedup_minutes: 0,
        expert_skills_speedup_minutes: 0,
        fire_crystal_shard: 0,
        refined_fire_crystal: 0,
      });
      onSaved();
    } catch (error) {
      toast.error(String(error));
    }
  };

  const activityList: { key: SlingshotActivityKey; label: string; unit?: string }[] = [
    { key: "pet_advancement", label: "Pet advancement (score +1)" },
    { key: "advanced_wild_mark", label: "Advanced Wild Mark" },
    { key: "common_wild_mark", label: "Common Wild Mark" },
    { key: "chief_gear_score", label: "Chief Gear Score (+1)" },
    { key: "hero_gear_essence_stone", label: "Hero Gear Essence Stone" },
    { key: "hero_exclusive_gear_widget", label: "Widget of Hero Exclusive Gear" },
    { key: "mithril", label: "Mithril" },
    { key: "fire_crystal", label: "Fire Crystal" },
    { key: "construction_speedup_minutes", label: "Construction Speedup", unit: "min" },
    { key: "research_speedup_minutes", label: "Research Speedup", unit: "min" },
    { key: "training_speedup_minutes", label: "Troops Training Speedup", unit: "min" },
    { key: "expert_skills_speedup_minutes", label: "Expert Skills Learning Speedup", unit: "min" },
    { key: "fire_crystal_shard", label: "Fire Crystal Shard" },
    { key: "refined_fire_crystal", label: "Refined Fire Crystal" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Player Info */}
      <div className="rounded-md ring-1 ring-line bg-panel p-4 space-y-3">
        <h2 className="text-sm font-semibold">Player Information</h2>
        <div>
          <label className="block text-xs font-medium text-mut mb-1">Player Name</label>
          <Input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter player name"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-mut mb-1">Player ID</label>
          <Input
            type="text"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            placeholder="Enter player ID"
            required
          />
        </div>
      </div>

      {/* Activities */}
      <div className="rounded-md ring-1 ring-line bg-panel p-4">
        <h2 className="text-lg font-semibold mb-4">Day 5: Power Boost Activities</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {activityList.map((activity) => (
            <ActivityInput
              key={activity.key}
              label={activity.label}
              value={activities[activity.key]}
              pointsPerUnit={SLINGSHOT_POINTS[activity.key]}
              onChange={(val) => handleActivityChange(activity.key, val)}
              unit={activity.unit}
            />
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="rounded-md ring-1 ring-primary bg-panel p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Total Points</p>
          <p className="font-mono text-xs text-mut">Sum of all activities</p>
        </div>
        <p className="text-2xl font-bold font-mono text-primary">{totalPoints.toLocaleString()}</p>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={saveEntry.isPending}
        className="w-full"
      >
        {saveEntry.isPending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}

function SubscribersList({ onSelectPlayer }: { onSelectPlayer: () => void }) {
  const entries = useSlingshotEntries();
  const currentPeriod = useCurrentPeriod();

  const [selectedEntry, setSelectedEntry] = useState<(typeof entries.data)[0] | null>(null);

  if (!currentPeriod.data) {
    return (
      <div className="rounded-md ring-1 ring-warn bg-panel px-4 py-8 text-center">
        <p className="text-sm text-warn">No active period.</p>
        <p className="font-mono text-xs text-mut mt-1">
          Please create a period first to track Slingshot entries.
        </p>
      </div>
    );
  }

  if (entries.isLoading) {
    return (
      <div className="rounded-md ring-1 ring-line bg-panel px-4 py-8 text-center">
        <p className="text-sm text-mut">Loading...</p>
      </div>
    );
  }

  if (entries.isError) {
    return (
      <div className="rounded-md ring-1 ring-warn bg-panel px-4 py-8 text-center">
        <p className="text-sm text-warn">Error loading subscribers</p>
        <p className="font-mono text-xs text-mut mt-1">{String(entries.error)}</p>
      </div>
    );
  }

  if (!entries.data || entries.data.length === 0) {
    return (
      <div className="rounded-md ring-1 ring-line bg-panel px-4 py-8 text-center">
        <p className="text-sm text-mut">No players saved for this period yet.</p>
        <p className="font-mono text-xs text-mut mt-1">
          Use the Player Entry tab to add your first submission.
        </p>
      </div>
    );
  }

  const totalPoints = entries.data.reduce((sum, e) => sum + e.total_points, 0);

  return (
    <div className="space-y-4">
      {/* Overall Total */}
      <div className="rounded-md ring-1 ring-primary bg-panel p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Overall Total</p>
          <p className="font-mono text-xs text-mut">{entries.data.length} player(s)</p>
        </div>
        <p className="text-2xl font-bold font-mono text-primary">{totalPoints.toLocaleString()}</p>
      </div>

      {/* Player List */}
      <div className="space-y-2">
        {entries.data.map((entry) => (
          <button
            key={entry.id}
            onClick={() => setSelectedEntry(entry)}
            className="w-full rounded-md ring-1 ring-line bg-panel p-4 text-left hover:ring-primary transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{entry.player_name}</p>
                <p className="font-mono text-xs text-mut">ID: {entry.player_id}</p>
              </div>
              <p className="font-mono text-lg font-bold text-primary">
                {entry.total_points.toLocaleString()}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEntry?.player_name}</DialogTitle>
            <DialogDescription>ID: {selectedEntry?.player_id}</DialogDescription>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-4">
              {/* Total */}
              <div className="rounded-md ring-1 ring-primary bg-panel2 px-4 py-3 flex items-center justify-between">
                <p className="text-sm font-semibold">Total Points</p>
                <p className="text-xl font-bold font-mono text-primary">
                  {selectedEntry.total_points.toLocaleString()}
                </p>
              </div>

              {/* Activity Breakdown */}
              <div className="space-y-2">
                {[
                  { key: "pet_advancement", label: "Pet advancement" },
                  { key: "advanced_wild_mark", label: "Advanced Wild Mark" },
                  { key: "common_wild_mark", label: "Common Wild Mark" },
                  { key: "chief_gear_score", label: "Chief Gear Score" },
                  { key: "hero_gear_essence_stone", label: "Hero Gear Essence Stone" },
                  { key: "hero_exclusive_gear_widget", label: "Widget of Hero Exclusive Gear" },
                  { key: "mithril", label: "Mithril" },
                  { key: "fire_crystal", label: "Fire Crystal" },
                  { key: "construction_speedup_minutes", label: "Construction Speedup (min)" },
                  { key: "research_speedup_minutes", label: "Research Speedup (min)" },
                  { key: "training_speedup_minutes", label: "Training Speedup (min)" },
                  { key: "expert_skills_speedup_minutes", label: "Expert Skills Speedup (min)" },
                  { key: "fire_crystal_shard", label: "Fire Crystal Shard" },
                  { key: "refined_fire_crystal", label: "Refined Fire Crystal" },
                ].map(({ key, label }) => {
                  const value = selectedEntry[key as keyof typeof selectedEntry] as number;
                  const points = value * SLINGSHOT_POINTS[key as SlingshotActivityKey];
                  if (value === 0) return null;
                  return (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-mut">{label}</span>
                      <div className="text-right">
                        <span className="font-mono">{value.toLocaleString()}</span>
                        <span className="text-mut mx-2">×</span>
                        <span className="font-mono text-primary">{points.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
