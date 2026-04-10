import { Spinner } from "@/components/Spinner";

export default function Loading() {
  return (
    <div className="flex h-screen items-center justify-center bg-zinc-50">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-[13px] font-medium text-zinc-400 animate-pulse">Loading chat…</p>
      </div>
    </div>
  );
}
