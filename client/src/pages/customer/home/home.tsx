import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../api/api";
import { Link } from "react-router-dom";
import { MapPin, Search } from "lucide-react";

interface Store {
  id: string;
  name: string;
  logo?: string;
  rating: number;
  is_prime: boolean;
}

interface Product {
  id: number;
  name: string;
  images: { url: string; is_main: boolean }[];
}

interface Category {
  id: string;
  name: string;
  image?: string;
}

export default function CustomerHome() {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const locationRequestedRef = useRef(false);

  useEffect(() => {
    if (locationRequestedRef.current) return;
    locationRequestedRef.current = true;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          locationRequestedRef.current = false;
        },
      );
    }
  }, []);

  const { data: storesRes } = useQuery({
    queryKey: ["stores", "nearby"],
    queryFn: () =>
      api.get(
        `/stores/nearby?lat=${location?.lat ?? 0}&lng=${location?.lng ?? 0}&radius=5`,
      ),
    enabled: !!location,
    staleTime: 60000,
  });

  const { data: primeRes } = useQuery({
    queryKey: ["stores", "prime"],
    queryFn: () =>
      api.get(
        `/stores/prime?lat=${location?.lat ?? 0}&lng=${location?.lng ?? 0}&radius=5`,
      ),
    enabled: !!location,
    staleTime: 60000,
  });

  const { data: productsRes } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => api.get("/products"),
    staleTime: 60000,
  });

  const { data: categoriesRes } = useQuery({
    queryKey: ["categories", "all"],
    queryFn: () => api.get("/categories"),
    staleTime: 60000,
  });

  const stores: Store[] = useMemo(() => storesRes?.data ?? [], [storesRes]);
  const primeStores: Store[] = useMemo(() => primeRes?.data ?? [], [primeRes]);
  const products: Product[] = useMemo(() => productsRes?.data ?? [], [productsRes]);
  const categories: Category[] = useMemo(() => categoriesRes?.data ?? [], [categoriesRes]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const term = search.toLowerCase();
    return products.filter((product) => product.name.toLowerCase().includes(term));
  }, [products, search]);

  const handleLocationClick = () => {
    locationRequestedRef.current = false;
    if (navigator.geolocation) {
      locationRequestedRef.current = true;
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          locationRequestedRef.current = false;
        },
      );
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-10 border-b border-border bg-background/90 px-4 py-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-background px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Mahsulot qidirish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={handleLocationClick}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background"
          >
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {!location && (
        <div className="mx-4 mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-center text-xs text-amber-800">
          Buyurtma berish uchun joylashuvingizni kiriting
        </div>
      )}

      <div className="space-y-6 p-4">
        {categories.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Kategoriyalar</h2>
              <span className="text-xs text-muted-foreground">{categories.length} ta</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="min-w-[110px] rounded-2xl border border-border bg-background p-3 text-center"
                >
                  {category.image ? (
                    <img
                      src={category.image}
                      alt={category.name}
                      className="mx-auto h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                      {category.name.charAt(0)}
                    </div>
                  )}
                  <p className="mt-2 text-xs font-medium text-foreground line-clamp-1">
                    {category.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {primeStores.length > 0 && (
          <div>
            <h2 className="text-base font-semibold mb-3 text-foreground">⭐ Prime Do'konlar</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {primeStores.map((store) => (
                <Link
                  key={store.id}
                  to={`/mobile/stores/${store.id}`}
                  className="flex-shrink-0 w-48 rounded-2xl border border-border bg-background p-3 shadow-sm"
                >
                  <div className="h-20 rounded-xl bg-muted mb-2 flex items-center justify-center overflow-hidden">
                    {store.logo ? (
                      <img src={store.logo} alt={store.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-2xl">🏪</span>
                    )}
                  </div>
                  <p className="font-medium text-sm truncate text-foreground">{store.name}</p>
                  <p className="text-xs text-muted-foreground">⭐ {store.rating}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {stores.length > 0 && (
          <div>
            <h2 className="text-base font-semibold mb-3 text-foreground">Yaqin Do'konlar</h2>
            <div className="grid grid-cols-2 gap-3">
              {stores.map((store) => (
                <Link
                  key={store.id}
                  to={`/mobile/stores/${store.id}`}
                  className="rounded-2xl border border-border bg-background p-3"
                >
                  <div className="h-24 rounded-xl bg-muted mb-2 flex items-center justify-center overflow-hidden">
                    {store.logo ? (
                      <img src={store.logo} alt={store.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-2xl">🏪</span>
                    )}
                  </div>
                  <p className="font-medium text-sm truncate text-foreground">{store.name}</p>
                  <p className="text-xs text-muted-foreground">⭐ {store.rating}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-base font-semibold mb-3 text-foreground">Barcha Mahsulotlar</h2>
          <div className="grid grid-cols-3 gap-2">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="rounded-2xl border border-border bg-background p-2"
              >
                <div className="h-20 rounded-xl bg-muted mb-2 flex items-center justify-center overflow-hidden">
                  {product.images?.[0]?.url ? (
                    <img src={product.images[0].url} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xl">📦</span>
                  )}
                </div>
                <p className="text-xs font-medium truncate text-foreground">{product.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
