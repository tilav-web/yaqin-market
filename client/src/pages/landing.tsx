import { Link } from "react-router-dom";
import {
  ArrowRightIcon,
  MapPinIcon,
  SendIcon,
  StoreIcon,
  TruckIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MetricCard from "@/components/common/metric-card";
import { getAccessToken } from "@/api/api";
import { getRoleHomePath } from "@/lib/market";
import { useAuthStore } from "@/stores/auth.store";

const highlights = [
  {
    icon: MapPinIcon,
    title: "Radius bo'yicha qidiruv",
    description:
      "Mijoz o'z joylashuvini belgilaydi va istalgan radius ichidagi do'konlarni ko'radi.",
  },
  {
    icon: StoreIcon,
    title: "Do'konlar bilan solishtirish",
    description:
      "Bir mahsulotni yaqin do'konlar bo'yicha taqqoslab, narx va masofaga qarab tanlash mumkin.",
  },
  {
    icon: SendIcon,
    title: "Broadcast so'rovlar",
    description:
      "Topa olmagan savatni butun yaqin bozorlarga yuborib, eng yaxshi taklifni tanlash mumkin.",
  },
  {
    icon: TruckIcon,
    title: "Yetkazib berish oqimi",
    description:
      "Seller qabul qiladi, kuryer olib ketadi, foydalanuvchi real jarayonni kuzatadi.",
  },
];

export default function LandingPage() {
  const me = useAuthStore((state) => state.me);
  const hasSession = Boolean(getAccessToken());
  const primaryTo = hasSession ? getRoleHomePath(me?.role) : "/login";
  const primaryLabel = hasSession ? "Platformaga kirish" : "Telefon bilan kirish";

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,124,61,0.18),transparent_35%),linear-gradient(180deg,#fff9f5_0%,#f8fbff_45%,#ffffff_100%)]">
      <section className="relative mx-auto flex max-w-7xl flex-col gap-14 px-6 pb-18 pt-8 lg:px-10">
        <div className="flex items-center justify-between">
          <div className="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur">
            Yaqin Market
          </div>
          <Link to={primaryTo}>
            <Button variant="outline" className="rounded-full px-5">
              {primaryLabel}
            </Button>
          </Link>
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-orange-700">
              Eng yaqin do'konlardan tez buyurtma
            </div>
            <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
              Bir xarita ichida yaqin do'konlar, tayyor narxlar va broadcast savat.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Yaqin Market mijozga atrofdagi do'konlardan tez buyurtma berish, mahsulot
              narxlarini taqqoslash va topa olmagan savatini sellerlar orasiga tashlash
              imkonini beradi.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={primaryTo}>
                <Button className="h-12 rounded-full px-6 text-sm font-semibold">
                  {primaryLabel}
                  <ArrowRightIcon />
                </Button>
              </Link>
              <Link to={hasSession ? primaryTo : "/login"}>
                <Button variant="outline" className="h-12 rounded-full px-6 text-sm">
                  Demo oqimni ko'rish
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <MetricCard
              label="Direct order"
              value="1-klik"
              hint="Store detail ichidan tayyor narxlar bilan tez buyurtma"
            />
            <MetricCard
              label="Broadcast"
              value="Ko'p taklif"
              hint="Mijoz so'rov tashlaydi, sellerlar raqobatli taklif beradi"
              tone="blue"
            />
            <MetricCard
              label="Radius"
              value="Moslashuvchan"
              hint="1km dan 15km gacha xarita bo'yicha tanlash"
              tone="green"
            />
            <MetricCard
              label="Seller panel"
              value="Real flow"
              hint="Store, mahsulot, order va request feed boshqaruvi"
              tone="slate"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-10">
        <div className="rounded-[2.5rem] border border-white/80 bg-white/80 p-8 shadow-[0_30px_120px_-72px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Nega aynan shu loyiha
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-950">
              Delivery marketplace va smart talab oqimi bir joyda
            </h2>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {highlights.map((item) => (
              <article
                key={item.title}
                className="rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fff7f1_100%)] p-5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
