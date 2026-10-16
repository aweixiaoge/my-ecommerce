"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ADMIN_NAV,
  isActiveHref,
  isGroupActive,
  isGroupOpen,
  NO_GROUP_CHOICES,
  toggleGroupOpen,
  type GroupOpenState,
} from "@/lib/admin/nav";

/**
 * The sidebar's navigation.
 *
 * A Client Component for exactly one reason: the current path is only readable
 * in the browser, and it is what decides which screen is lit. Everything else
 * about the sidebar — the brand, the signed-in admin, sign-out — is the same on
 * every request and stays in the server-rendered `AdminSidebar`. Keeping the
 * client boundary this small means the nav is the only part of the chrome in
 * the bundle, and it re-renders on navigation while the rest does not.
 *
 * Groups start open only when they hold the current screen — the flip the
 * single-group version deferred until the nav outgrew one group. Which groups
 * that leaves open, and what a click does about it, is `isGroupOpen`'s and
 * `toggleGroupOpen`'s; this file only renders their answer.
 */
export function AdminNav() {
  const pathname = usePathname();

  // The clicks that went against the defaults. Navigation deliberately does not
  // reopen a group the person closed: one that springs back open after you
  // collapse it and click elsewhere feels broken, and nothing here is hidden
  // for long.
  const [groups, setGroups] = useState<GroupOpenState>(NO_GROUP_CHOICES);

  function toggle(id: string, open: boolean) {
    setGroups((current) => toggleGroupOpen(current, id, open));
  }

  return (
    <nav aria-label="Admin sections" className="flex flex-col gap-1">
      {ADMIN_NAV.map((group) => {
        const open = isGroupOpen(pathname, group, groups);
        const groupActive = isGroupActive(pathname, group);

        return (
          <div key={group.id}>
            <button
              type="button"
              // Readable by the list below as the name of what it opens, so
              // two items labelled "Category" are announced as "Products,
              // Category" and "Blogs, Category" rather than twice the same.
              id={`admin-nav-${group.id}-label`}
              aria-expanded={open}
              aria-controls={`admin-nav-${group.id}`}
              onClick={() => toggle(group.id, open)}
              className={`flex h-10 w-full items-center gap-2 rounded-control px-3 text-left text-[13px] font-bold leading-[16.9px] tracking-[-0.076px] transition-colors hover:bg-mist hover:text-ink ${
                groupActive ? "text-ink" : "text-ink-62"
              }`}
            >
              <Image
                src="/icons/chevron-down.svg"
                alt=""
                width={9}
                height={6}
                // Points down when the group is open, right when it is closed.
                className={open ? "" : "-rotate-90"}
              />
              {group.label}
            </button>

            {/*
              The `hidden` *attribute* is not an option here: the `flex` class
              below it sets `display`, and an author class beats the browser's
              `[hidden]` rule, so the list would stay on screen. Toggling the
              class is what actually hides it.
            */}
            <ul
              id={`admin-nav-${group.id}`}
              aria-labelledby={`admin-nav-${group.id}-label`}
              className={
                open ? "mt-0.5 flex flex-col gap-0.5" : "hidden"
              }
            >
              {group.items.map((item) => {
                const current = isActiveHref(pathname, item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      // Announced by screen readers, and the hook any future
                      // `aria-current` styling can hang from — the visual
                      // highlight is the class below, not this.
                      aria-current={current ? "page" : undefined}
                      className={`flex h-9 items-center rounded-control pr-3 pl-8 text-[13px] leading-[16.9px] tracking-[-0.076px] transition-colors ${
                        current
                          ? "bg-mist font-bold text-ink"
                          : "text-ink-62 hover:bg-mist hover:text-ink"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
