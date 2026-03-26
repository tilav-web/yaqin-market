import CategoryList from "../products/_components/category-list";

export default function AdminCategories() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Kategoriyalar</h1>
        <p className="text-sm text-muted-foreground">
          Katalogni tartibga solish uchun kategoriyalarni boshqaring.
        </p>
      </div>
      <CategoryList />
    </div>
  );
}
