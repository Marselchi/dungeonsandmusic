import { Progress } from "@/components/ui/progress";
export function DownloadProgress({
  progress,
}: Readonly<{
  progress: Record<string, { done: number; total: number }>;
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
            <span className="text-muted-foreground">
              {job.done}/{job.total}
            </span>
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
