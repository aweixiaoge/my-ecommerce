import type { Metadata } from "next";

/**
 * The product screen, currently a placeholder.
 *
 * It exists so the sidebar entry has somewhere to land: a menu that 404s reads
 * as a broken admin, and it would also make every navigation to it a failed
 * prefetch in the console. The list, the editor and variants replace this.
 *
 * No session check — the shell layout above has already refused anyone
 * unauthenticated.
 */
export const metadata: Metadata = {
  title: "Product",
};

export default function AdminProductsPage() {
  return (
    <div className="max-w-[480px]">
      <h1 className="text-[25px] font-bold leading-[37.5px] tracking-[0.14px] text-ink">
        Product
      </h1>
      <p className="mt-1 text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
        The product list, editor and variants land here with the catalog work.
      </p>
    </div>
  );
}
