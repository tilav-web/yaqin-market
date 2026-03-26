import { Link } from "react-router-dom";

export default function SellerDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Seller panel</h1>
        <p className="text-sm text-muted-foreground">
          Do'koningizni boshqarish uchun tezkor bo'limlar.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Link
          to="/seller/store"
          className="rounded-3xl border border-border bg-card/90 p-6 text-center shadow-[0_18px_50px_-45px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
        >
          <span className="text-3xl">🏪</span>
          <p className="mt-3 font-medium text-foreground">Mening do'konim</p>
          <p className="text-xs text-muted-foreground">Profil va sozlamalar</p>
        </Link>
        <Link
          to="/seller/orders"
          className="rounded-3xl border border-border bg-card/90 p-6 text-center shadow-[0_18px_50px_-45px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
        >
          <span className="text-3xl">📦</span>
          <p className="mt-3 font-medium text-foreground">Buyurtmalar</p>
          <p className="text-xs text-muted-foreground">Yangi buyurtmalar oqimi</p>
        </Link>
      </div>
    </div>
  );
}
