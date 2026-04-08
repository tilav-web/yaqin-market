import { InfoIcon, SendIcon, InstagramIcon, FileTextIcon, ShieldIcon } from "lucide-react";
import { useLang } from "@/context/lang.context";

export default function AboutPage() {
  const { lang } = useLang();

  const ru = lang === "ru";

  return (
    <div className="space-y-4 px-4 pb-28 pt-4">
      {/* Hero */}
      <section className="rounded-[1.75rem] border border-white/70 bg-white/92 p-6 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.3)]">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-100 text-4xl">
            🏪
          </div>

          <h1 className="mt-4 text-2xl font-bold text-slate-950">Yaqin Market</h1>
          <p className="mt-1 text-sm text-slate-400">v1.0.0</p>

          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600">
            {ru
              ? "Yaqin Market — удобное приложение для заказа продуктов и товаров с быстрой доставкой прямо к вашей двери. Мы связываем покупателей с местными продавцами и курьерами."
              : "Yaqin Market — mahsulot va tovarlarni tez yetkazib berish bilan buyurtma qilish uchun qulay ilova. Biz xaridorlarni mahalliy sotuvchilar va kuryerlar bilan bog'laymiz."}
          </p>
        </div>
      </section>

      {/* App Info */}
      <section className="rounded-[1.75rem] border border-white/70 bg-white/92 p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.3)]">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
            <InfoIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-slate-500">{ru ? "О приложении" : "Ilova haqida"}</p>
            <h2 className="text-lg font-semibold text-slate-950">Yaqin Market</h2>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex justify-between rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-500">{ru ? "Версия" : "Versiya"}</span>
            <span className="text-sm font-medium text-slate-950">1.0.0</span>
          </div>
          <div className="flex justify-between rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-500">{ru ? "Разработчик" : "Ishlab chiquvchi"}</span>
            <span className="text-sm font-medium text-slate-950">Yaqin Market Team</span>
          </div>
        </div>
      </section>

      {/* Social Links */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-950">
          {ru ? "Мы в соцсетях" : "Ijtimoiy tarmoqlar"}
        </h2>

        <a
          href="https://t.me/yaqin_market"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-[1.5rem] border border-white/70 bg-white/92 px-4 py-3 shadow-sm transition-colors active:bg-slate-50"
        >
          <SendIcon className="h-5 w-5 text-slate-500" />
          <div>
            <p className="font-medium text-slate-950">Telegram</p>
            <p className="text-sm text-slate-500">@yaqin_market</p>
          </div>
        </a>

        <a
          href="https://instagram.com/yaqin_market"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-[1.5rem] border border-white/70 bg-white/92 px-4 py-3 shadow-sm transition-colors active:bg-slate-50"
        >
          <InstagramIcon className="h-5 w-5 text-slate-500" />
          <div>
            <p className="font-medium text-slate-950">Instagram</p>
            <p className="text-sm text-slate-500">@yaqin_market</p>
          </div>
        </a>
      </section>

      {/* Legal */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-950">
          {ru ? "Юридическая информация" : "Huquqiy ma'lumotlar"}
        </h2>

        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-[1.5rem] border border-white/70 bg-white/92 px-4 py-3 shadow-sm">
            <FileTextIcon className="h-5 w-5 text-slate-500" />
            <div>
              <p className="font-medium text-slate-950">
                {ru ? "Условия использования" : "Foydalanish shartlari"}
              </p>
              <p className="text-sm text-slate-500">
                {ru
                  ? "Правила пользования приложением Yaqin Market"
                  : "Yaqin Market ilovasidan foydalanish qoidalari"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-[1.5rem] border border-white/70 bg-white/92 px-4 py-3 shadow-sm">
            <ShieldIcon className="h-5 w-5 text-slate-500" />
            <div>
              <p className="font-medium text-slate-950">
                {ru ? "Политика конфиденциальности" : "Maxfiylik siyosati"}
              </p>
              <p className="text-sm text-slate-500">
                {ru
                  ? "Как мы собираем и используем ваши данные"
                  : "Ma'lumotlaringizni qanday yig'amiz va ishlatamiz"}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
