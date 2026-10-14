import Link from "next/link";

export const metadata = {
  title: "Cart",
};

export default function CartPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Your cart</h1>

      <div className="mt-8 rounded-lg border border-dashed border-neutral-300 px-6 py-16 text-center">
        <p className="text-sm text-neutral-600">Your cart is empty.</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
