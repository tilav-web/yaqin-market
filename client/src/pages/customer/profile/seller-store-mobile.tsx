import { ChevronLeftIcon, StoreIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SellerStore from "@/pages/seller/store/store";
import { Button } from "@/components/ui/button";

export default function SellerStoreMobilePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-24">
      <div className="space-y-4 p-4">
        <section className="rounded-3xl border border-border bg-card/90 p-4 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)]">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-2xl"
              onClick={() => navigate("/mobile/profile")}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <StoreIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Seller workspace</p>
                <h1 className="truncate text-lg font-semibold text-foreground">
                  Do'kon boshqaruvi
                </h1>
              </div>
            </div>
          </div>
        </section>

        <SellerStore />
      </div>
    </div>
  );
}
