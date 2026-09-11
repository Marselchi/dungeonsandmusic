import { X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
export function DownloadProgress({
  progress,
  onDismiss,
}: Readonly<{
  progress: Record<string, { done: number; total: number }>;
  onDismiss?: (jobId: string) => void;
}>) {
  return (
    <>
      {Object.entries(progress).map(([jobId, job]) => (
        <div
          key={jobId}
          className="fixed bottom-5 right-5 w-72 rounded-xl border bg-card p-4 shadow-xl"
        >
          <div className="flex items-center justify-between text-sm">
            <span>Загрузка трека</span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {job.done}/{job.total}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onDismiss?.(jobId)}
                aria-label="Закрыть уведомление о загрузке"
              >
                <X />
              </Button>
            </div>
          </div>
          <Progress
            value={job.total ? (job.done / job.total) * 100 : 0}
            className="mt-3"
          />
        </div>
      ))}
    </>
  );
}
