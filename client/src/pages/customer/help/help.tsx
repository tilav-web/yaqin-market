import { useState } from "react";
import { ChevronDownIcon, HeadphonesIcon, PhoneIcon, SendIcon } from "lucide-react";
import { useLang } from "@/context/lang.context";
import { cn } from "@/lib/utils";

type FaqItem = { q: { uz: string; ru: string }; a: { uz: string; ru: string } };

const faqs: FaqItem[] = [
  {
    q: { uz: "Qanday buyurtma beraman?", ru: "Как сделать заказ?" },
    a: {
      uz: "Kerakli mahsulotni toping, savatga qo'shing va buyurtmani tasdiqlang. To'lov usulini tanlang va yetkazib berish manzilini ko'rsating.",
      ru: "Найдите нужный товар, добавьте в корзину и подтвердите заказ. Выберите способ оплаты и укажите адрес доставки.",
    },
  },
  {
    q: { uz: "Yetkazib berish qancha vaqt oladi?", ru: "Сколько времени занимает доставка?" },
    a: {
      uz: "Yetkazib berish odatda 30 daqiqadan 2 soatgacha davom etadi. Masofaga va yuklanishga qarab vaqt o'zgarishi mumkin.",
      ru: "Доставка обычно занимает от 30 минут до 2 часов. Время может варьироваться в зависимости от расстояния и загруженности.",
    },
  },
  {
    q: { uz: "Buyurtmani bekor qilsam bo'ladimi?", ru: "Можно ли отменить заказ?" },
    a: {
      uz: "Ha, buyurtma sotuvchi tomonidan qabul qilinmaguncha bekor qilish mumkin. Buyurtma sahifasida 'Bekor qilish' tugmasini bosing.",
      ru: "Да, заказ можно отменить до принятия продавцом. Нажмите кнопку 'Отменить' на странице заказа.",
    },
  },
  {
    q: { uz: "Qanday to'lov usullari mavjud?", ru: "Какие способы оплаты доступны?" },
    a: {
      uz: "Naqd pul, Click, Payme va hamyon orqali to'lash mumkin. To'lov usulini buyurtma berish vaqtida tanlaysiz.",
      ru: "Оплата доступна наличными, через Click, Payme и кошелёк. Способ оплаты выбирается при оформлении заказа.",
    },
  },
  {
    q: { uz: "Sotuvchi bo'lish uchun nima qilish kerak?", ru: "Как стать продавцом?" },
    a: {
      uz: "Profil sahifasidan 'Sotuvchi bo'lish' tugmasini bosing va arizani to'ldiring. Ariza ko'rib chiqilgach sizga xabar beramiz.",
      ru: "Нажмите 'Стать продавцом' в профиле и заполните заявку. После рассмотрения мы вас уведомим.",
    },
  },
  {
    q: { uz: "Mahsulot sifati kafolatlanganmi?", ru: "Гарантировано ли качество товара?" },
    a: {
      uz: "Barcha sotuvchilar tekshiruvdan o'tadi. Agar mahsulot sifati past bo'lsa, qo'llab-quvvatlash xizmatiga murojaat qiling — muammoni hal qilamiz.",
      ru: "Все продавцы проходят проверку. Если качество товара низкое, обратитесь в службу поддержки — мы решим вопрос.",
    },
  },
];

export default function HelpPage() {
  const { lang } = useLang();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const ru = lang === "ru";

  return (
    <div className="space-y-4 px-4 pb-28 pt-4">
      {/* Header */}
      <section className="rounded-[1.75rem] border border-white/70 bg-white/92 p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.3)]">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
            <HeadphonesIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-slate-500">{ru ? "Поддержка" : "Yordam"}</p>
            <h1 className="text-xl font-semibold text-slate-950">
              {ru ? "Центр помощи" : "Yordam markazi"}
            </h1>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-950">
          {ru ? "Часто задаваемые вопросы" : "Ko'p beriladigan savollar"}
        </h2>

        <div className="space-y-2">
          {faqs.map((faq, i) => {
            const isOpen = openIdx === i;
            return (
              <button
                key={i}
                type="button"
                className="w-full rounded-[1.5rem] border border-white/70 bg-white/92 px-4 py-3 text-left shadow-sm transition-colors"
                onClick={() => setOpenIdx(isOpen ? null : i)}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-950">
                    {ru ? faq.q.ru : faq.q.uz}
                  </span>
                  <ChevronDownIcon
                    className={cn(
                      "h-4 w-4 shrink-0 text-slate-400 transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </div>
                {isOpen && (
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {ru ? faq.a.ru : faq.a.uz}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Contact */}
      <section className="rounded-[1.75rem] border border-white/70 bg-white/92 p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.3)]">
        <h2 className="text-lg font-semibold text-slate-950">
          {ru ? "Связаться с нами" : "Biz bilan bog'lanish"}
        </h2>

        <div className="mt-4 space-y-3">
          <a
            href="tel:+998xxxxxxxxx"
            className="flex items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 transition-colors active:bg-slate-100"
          >
            <PhoneIcon className="h-5 w-5 text-slate-500" />
            <div>
              <p className="text-sm text-slate-500">{ru ? "Телефон" : "Telefon"}</p>
              <p className="font-medium text-slate-950">+998 xx xxx xx xx</p>
            </div>
          </a>

          <a
            href="https://t.me/yaqin_market"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 transition-colors active:bg-slate-100"
          >
            <SendIcon className="h-5 w-5 text-slate-500" />
            <div>
              <p className="text-sm text-slate-500">Telegram</p>
              <p className="font-medium text-slate-950">@yaqin_market</p>
            </div>
          </a>
        </div>
      </section>
    </div>
  );
}
