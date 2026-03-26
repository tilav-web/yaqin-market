import { Link } from "react-router-dom";

export default function CourierDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Courier panel</h1>
        <p className="text-sm text-muted-foreground">
          Yetkazib berish buyurtmalarini boshqaring.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Link
          to="/courier/orders"
          className="rounded-3xl border border-border bg-card/90 p-6 text-center shadow-[0_18px_50px_-45px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
        >
          <span className="text-3xl">🚚</span>
          <p className="mt-3 font-medium text-foreground">Yetkazish buyurtmalar</p>
          <p className="text-xs text-muted-foreground">Yangi va faol buyurtmalar</p>
        </Link>
      </div>
    </div>
  );
}
