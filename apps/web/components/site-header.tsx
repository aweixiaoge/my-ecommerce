import Link from "next/link";
import type { CategoryRef } from "@my-ecommerce/shared";

export function SiteHeader({ categories }: { categories: CategoryRef[] }) {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="text-base font-semibold tracking-tight">
          Store
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="text-sm text-neutral-600 transition-colors hover:text-neutral-900"
            >
              {category.name}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <Link
            href="/cart"
            className="text-sm text-neutral-600 transition-colors hover:text-neutral-900"
          >
            Cart
          </Link>
        </div>
      </div>
    </header>
  );
}
