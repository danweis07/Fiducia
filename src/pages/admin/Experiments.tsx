/**
 * Experiments Admin Page
 *
 * Manage A/B experiments — create, start/pause/complete, and view results.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Play, Pause, CheckCircle2, BarChart3, FlaskConical, Loader2 } from "lucide-react";
import type {
  Experiment,
  ExperimentStatus,
  ExperimentResults,
  ExperimentVariantInput,
} from "@/types/experiments";

const experimentKeys = {
  all: ["experiments"] as const,
  list: (status?: ExperimentStatus) => ["experiments", "list", status] as const,
  results: (id: string) => ["experiments", "results", id] as const,
};

function ResultsView({ experimentId }: { experimentId: string }) {
  const { t } = useTranslation("admin");
  const { data, isLoading } = useQuery({
    queryKey: experimentKeys.results(experimentId),
    queryFn: () => gateway.experiments.results(experimentId),
  });

  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
  if (!data)
    return <p className="text-sm text-muted-foreground">{t("experiments.noResultsYet")}</p>;

  const results = data as ExperimentResults;
  const maxImpressions = Math.max(...results.variants.map((v) => v.impressions), 1);

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold">{results.totalImpressions.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{t("experiments.totalImpressions")}</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{results.totalConversions.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{t("experiments.totalConversions")}</p>
        </div>
      </div>
      <div className="space-y-3">
        {results.variants.map((v) => (
          <div key={v.variantId} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {v.variantName}{" "}
                {v.isControl && (
                  <span className="text-muted-foreground">({t("experiments.control")})</span>
                )}
              </span>
              <span>{(v.conversionRate * 100).toFixed(2)}% conv.</span>
            </div>
            <div className="h-4 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${v.isControl ? "bg-gray-400" : "bg-primary"}`}
                style={{ width: `${(v.impressions / maxImpressions) * 100}%` }}
              />
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>{v.impressions.toLocaleString()} impr.</span>
              <span>
                {v.clicks.toLocaleString()} clicks ({(v.clickRate * 100).toFixed(1)}%)
              </span>
              <span>{v.conversions.toLocaleString()} conv.</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateExperimentDialog({ onCreated }: { onCreated: () => void }) {
  const { t } = useTranslation("admin");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [metric, setMetric] = useState("click_rate");
  const [trafficPercent, setTrafficPercent] = useState(100);
  const [variants, setVariants] = useState<ExperimentVariantInput[]>([
    { name: "Control", weight: 50, isControl: true },
    { name: "Variant A", weight: 50, isControl: false },
  ]);

  const createMutation = useMutation({
    mutationFn: () =>
      gateway.experiments.create({
        name,
        description: description || undefined,
        metric,
        trafficPercent,
        variants,
      }),
    onSuccess: () => {
      toast({ title: t("experiments.toasts.experimentCreated") });
      setOpen(false);
      setName("");
      setDescription("");
      onCreated();
    },
    onError: () => {
      toast({ title: t("experiments.toasts.createFailed"), variant: "destructive" });
    },
  });

  const updateVariant = (index: number, updates: Partial<ExperimentVariantInput>) => {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...updates } : v)));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> {t("experiments.newExperiment")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("experiments.createTitle")}</DialogTitle>
          <DialogDescription>{t("experiments.createDescription")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("experiments.form.name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("experiments.form.namePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("experiments.form.description")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("experiments.form.metric")}</Label>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="click_rate">{t("experiments.metrics.clickRate")}</SelectItem>
                  <SelectItem value="conversion_rate">
                    {t("experiments.metrics.conversionRate")}
                  </SelectItem>
                  <SelectItem value="dismiss_rate">
                    {t("experiments.metrics.dismissRate")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("experiments.form.trafficPercent")}</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={trafficPercent}
                onChange={(e) => setTrafficPercent(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("experiments.form.variants")}</Label>
            {variants.map((v, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  value={v.name}
                  onChange={(e) => updateVariant(i, { name: e.target.value })}
                  placeholder={t("experiments.form.variantNamePlaceholder")}
                  className="flex-1"
                />
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={v.weight}
                  onChange={(e) => updateVariant(i, { weight: Number(e.target.value) })}
                  className="w-20"
                  placeholder={t("experiments.form.weightPlaceholder")}
                />
                <Badge
                  variant={v.isControl ? "default" : "outline"}
                  className="text-xs whitespace-nowrap"
                >
                  {v.isControl ? t("experiments.control") : t("experiments.variant")}
                </Badge>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setVariants((p) => [
                  ...p,
                  {
                    name: `Variant ${String.fromCharCode(65 + p.length - 1)}`,
                    weight: 50,
                    isControl: false,
                  },
                ])
              }
            >
              {t("experiments.addVariant")}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("experiments.cancel")}
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!name || createMutation.isPending}
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("experiments.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Experiments() {
  const { t } = useTranslation("admin");
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ExperimentStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: experiments = [], isLoading } = useQuery({
    queryKey: experimentKeys.list(statusFilter === "all" ? undefined : statusFilter),
    queryFn: () =>
      gateway.experiments.list(
        statusFilter === "all" ? {} : { status: statusFilter as ExperimentStatus },
      ),
  });

  const actionMutation = useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: "start" | "pause" | "resume" | "complete";
    }) => {
      switch (action) {
        case "start":
          return gateway.experiments.start(id);
        case "pause":
          return gateway.experiments.pause(id);
        case "resume":
          return gateway.experiments.resume(id);
        case "complete":
          return gateway.experiments.complete(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: experimentKeys.all });
      toast({ title: t("experiments.toasts.experimentUpdated") });
    },
  });

  const invalidateList = () => queryClient.invalidateQueries({ queryKey: experimentKeys.all });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="h-6 w-6" /> {t("experiments.title")}
          </h1>
          <p className="text-muted-foreground">{t("experiments.subtitle")}</p>
        </div>
        <CreateExperimentDialog onCreated={invalidateList} />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "draft", "running", "paused", "completed"] as const).map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(s)}
            className="capitalize"
          >
            {s}
          </Button>
        ))}
      </div>

      {/* Experiment list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (experiments as Experiment[]).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("experiments.noExperiments")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {(experiments as Experiment[]).map((exp) => (
            <Card key={exp.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{exp.name}</CardTitle>
                    {exp.description && (
                      <CardDescription className="mt-1">{exp.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={exp.status} />
                    {exp.status === "draft" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => actionMutation.mutate({ id: exp.id, action: "start" })}
                      >
                        <Play className="h-3 w-3 mr-1" /> {t("experiments.actions.start")}
                      </Button>
                    )}
                    {exp.status === "running" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => actionMutation.mutate({ id: exp.id, action: "pause" })}
                        >
                          <Pause className="h-3 w-3 mr-1" /> {t("experiments.actions.pause")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => actionMutation.mutate({ id: exp.id, action: "complete" })}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />{" "}
                          {t("experiments.actions.complete")}
                        </Button>
                      </>
                    )}
                    {exp.status === "paused" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => actionMutation.mutate({ id: exp.id, action: "resume" })}
                      >
                        <Play className="h-3 w-3 mr-1" /> {t("experiments.actions.resume")}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedId(expandedId === exp.id ? null : exp.id)}
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6 text-sm text-muted-foreground">
                  <span>
                    {t("experiments.metricLabel")}:{" "}
                    <span className="font-medium text-foreground">{exp.metric}</span>
                  </span>
                  <span>
                    {t("experiments.trafficLabel")}:{" "}
                    <span className="font-medium text-foreground">{exp.trafficPercent}%</span>
                  </span>
                  {exp.startedAt && (
                    <span>
                      {t("experiments.startedLabel")}:{" "}
                      {new Date(exp.startedAt).toLocaleDateString()}
                    </span>
                  )}
                  {exp.endedAt && (
                    <span>
                      {t("experiments.endedLabel")}: {new Date(exp.endedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {expandedId === exp.id && <ResultsView experimentId={exp.id} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
