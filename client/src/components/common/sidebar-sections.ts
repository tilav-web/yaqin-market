import {
  BoxesIcon,
  FileCheckIcon,
  LayoutGridIcon,
  MegaphoneIcon,
  MessageSquareTextIcon,
  RulerIcon,
  ScaleIcon,
  SendIcon,
  Settings2Icon,
  ShoppingBagIcon,
  StoreIcon,
  TruckIcon,
  UserRoundIcon,
  Users2Icon,
} from "lucide-react";
import type { SidebarSection } from "./app-sidebar";

export const adminSections: SidebarSection[] = [
  {
    label: "Boshqaruv",
    items: [
      { label: "Dashboard", to: "/admin", icon: LayoutGridIcon },
      { label: "Mahsulotlar", to: "/admin/products", icon: BoxesIcon },
      { label: "Do'konlar", to: "/admin/stores", icon: StoreIcon },
      { label: "Foydalanuvchilar", to: "/admin/users", icon: Users2Icon },
      { label: "Birliklar", to: "/admin/units", icon: RulerIcon },
      { label: "Arizalar", to: "/admin/applications", icon: FileCheckIcon },
      { label: "Qaytim nizolari", to: "/admin/disputes", icon: ScaleIcon },
      { label: "Sharhlar", to: "/admin/reviews", icon: MessageSquareTextIcon },
      { label: "Bildirishnoma", to: "/admin/broadcast", icon: MegaphoneIcon },
    ],
  },
  {
    label: "Account",
    items: [{ label: "Profil", to: "/admin/profile", icon: UserRoundIcon }],
  },
];

export const sellerSections: SidebarSection[] = [
  {
    label: "Seller panel",
    items: [
      { label: "Dashboard", to: "/seller", icon: LayoutGridIcon },
      { label: "Do'konim", to: "/seller/store", icon: StoreIcon },
      { label: "Mahsulotlar", to: "/seller/products", icon: BoxesIcon },
      { label: "Buyurtmalar", to: "/seller/orders", icon: ShoppingBagIcon },
      { label: "So'rovlar", to: "/seller/requests", icon: SendIcon },
      { label: "Sozlamalar", to: "/seller/settings", icon: Settings2Icon },
    ],
  },
];

export const courierSections: SidebarSection[] = [
  {
    label: "Courier panel",
    items: [
      { label: "Dashboard", to: "/courier", icon: LayoutGridIcon },
      { label: "Buyurtmalar", to: "/courier/orders", icon: TruckIcon },
    ],
  },
];
