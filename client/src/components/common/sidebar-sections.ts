import {
  BoxesIcon,
  LayoutGridIcon,
  ShoppingBagIcon,
  StoreIcon,
  TruckIcon,
} from "lucide-react";
import type { SidebarSection } from "./app-sidebar";

export const adminSections: SidebarSection[] = [
  {
    label: "Boshqaruv",
    items: [
      { label: "Dashboard", to: "/admin", icon: LayoutGridIcon },
      { label: "Mahsulotlar", to: "/admin/products", icon: BoxesIcon },
      { label: "Kategoriyalar", to: "/admin/categories", icon: BoxesIcon },
      { label: "Do'konlar", to: "/admin/stores", icon: StoreIcon },
    ],
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
