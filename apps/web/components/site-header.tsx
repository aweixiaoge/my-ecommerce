import Image from "next/image";
import Link from "next/link";
import { NAV } from "@/lib/nav";

export function SiteHeader() {
  return (
    <header className="bg-paper">
      {/*
        The design's container is a 1fr / auto / 1fr grid: the nav column is
        auto-sized and the two flanks are equal, which is what centres it.
      */}
      <div className="container-content grid h-[100px] grid-cols-[1fr_auto_1fr] items-center">
        <Link
          href="/"
          className="text-[25px] font-bold leading-[37.5px] tracking-[0.14px] text-ink"
        >
          Smart Mall
        </Link>

        <nav className="hidden items-center lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              prefetch={false}
              className="px-[12.5px] text-[13px] font-bold leading-[16.9px] tracking-[-0.076px] whitespace-nowrap text-ink"
            >
              {item.label}
            </Link>
          ))}

          <Link
            href="/"
            className="flex items-center gap-1.5 px-[12.5px] text-[13px] font-bold leading-[16.9px] tracking-[-0.076px] text-ink"
          >
            EN
            <Image src="/icons/chevron-down.svg" alt="" width={9} height={6} />
          </Link>

          <Link
            href="/"
            className="flex items-center gap-1.5 px-[12.5px] text-[13px] font-bold leading-[16.9px] tracking-[-0.076px] text-ink"
          >
            USD
            <Image src="/icons/chevron-down.svg" alt="" width={9} height={6} />
          </Link>
        </nav>

        <div className="flex items-center justify-end">
          <button type="button" aria-label="Search" className="px-2.5">
            <Image src="/icons/search.svg" alt="" width={15} height={15} />
          </button>

          <Link href="/cart" className="flex items-center gap-2 pl-2.5">
            <span className="text-[13px] font-semibold leading-[21.45px] tracking-[-0.076px] text-ink">
              $0.00
            </span>
            <Image src="/icons/cart.svg" alt="Cart" width={15} height={14} />
          </Link>
        </div>
      </div>
    </header>
  );
}
