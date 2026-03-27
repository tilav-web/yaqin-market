export default function FullPageLoader({
  title = "Yaqin Market yuklanmoqda",
  description = "Ma'lumotlar tayyorlanmoqda...",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-[2rem] border border-white/60 bg-white/85 p-8 text-center shadow-[0_24px_80px_-48px_rgba(15,23,42,0.35)] backdrop-blur">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[conic-gradient(from_180deg_at_50%_50%,rgba(255,97,67,0.15),rgba(255,97,67,1),rgba(255,169,77,0.45),rgba(255,97,67,0.15))] p-1">
          <div className="flex h-full w-full animate-pulse items-center justify-center rounded-full bg-white text-lg font-semibold text-slate-900">
            YM
          </div>
        </div>
        <h1 className="mt-5 text-xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}
