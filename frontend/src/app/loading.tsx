import { LoadingState } from "@/components/ui/states";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950">
      <LoadingState message="Ładowanie strony..." />
    </div>
  );
}
