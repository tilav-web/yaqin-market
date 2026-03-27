import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-[2rem] border border-white/70 bg-white/85 p-8 text-center shadow-[0_24px_80px_-50px_rgba(15,23,42,0.35)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          404
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-slate-950">
          Sahifa topilmadi
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          Bu yo'nalish hozir mavjud emas yoki boshqa joyga ko'chirilgan.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/">
            <Button>Bosh sahifaga qaytish</Button>
          </Link>
          <Link to="/mobile">
            <Button variant="outline">Ilovani ochish</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
