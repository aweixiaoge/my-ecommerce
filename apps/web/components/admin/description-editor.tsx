"use client";

import { useRef, useState } from "react";
import { MarkdownPreview } from "./markdown-preview";

/**
 * The markdown editor: a Write tab and a Preview tab over one value.
 *
 * A Client Component because the preview has to be immediate — a round trip to
 * the server would show the author their own copy a second late, which is the
 * whole reason it is a tab rather than a page. The value is controlled and
 * belongs to the form above it: this renders and edits what it is given, and
 * decides nothing about what gets submitted.
 */

const TABS = [
  { id: "write", label: "Write" },
  { id: "preview", label: "Preview" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function DescriptionEditor({
  value,
  onChange,
  messages,
}: {
  value: string;
  onChange: (value: string) => void;
  messages?: string[];
}) {
  const [tab, setTab] = useState<TabId>("write");

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className={LABEL}>Description</h2>

        <div
          role="tablist"
          aria-label="Description editor"
          className="flex gap-1 rounded-control border border-line p-0.5"
        >
          {TABS.map((entry, index) => (
            <Tab
              key={entry.id}
              entry={entry}
              index={index}
              selected={tab === entry.id}
              onSelect={setTab}
            />
          ))}
        </div>
      </div>

      <div
        role="tabpanel"
        aria-labelledby={`description-tab-${tab}`}
        className="rounded-card border border-line"
      >
        {tab === "write" ? (
          <textarea
            id="description"
            name="description"
            rows={14}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={"## Materials\n\n- Recycled aluminium\n- **Memory** foam"}
            className="w-full resize-y rounded-card bg-paper p-3 font-mono text-[13px] leading-[21.45px] text-ink outline-none focus:ring-2 focus:ring-ink/15"
          />
        ) : (
          <div className="p-4">
            <MarkdownPreview source={value} />
          </div>
        )}
      </div>

      {/*
        The textarea is unmounted while the preview is showing, so on that tab
        nothing would send the description — submitting from the preview would
        save a product with no copy. The value travels in a hidden field
        instead, so the description is submitted from either tab.
      */}
      {tab !== "write" && (
        <input type="hidden" name="description" value={value} />
      )}

      <p className="text-[12px] leading-[19.8px] text-ink-55">
        Markdown: # headings, - lists, **bold**, *italic*, `code` and [links](https://example.com).
      </p>

      {messages && messages.length > 0 && (
        <ul
          id="description-error"
          className="text-[12px] leading-[19.8px] text-red-600"
        >
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Tab({
  entry,
  index,
  selected,
  onSelect,
}: {
  entry: (typeof TABS)[number];
  index: number;
  selected: boolean;
  onSelect: (id: TabId) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  /**
   * Arrow keys move between tabs and take the focus with them — the behaviour
   * a tablist is expected to have, and the reason only the selected tab is in
   * the tab order (`tabIndex` below): one stop for the pair, not two.
   */
  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % TABS.length
        : event.key === "ArrowLeft"
          ? (index - 1 + TABS.length) % TABS.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? TABS.length - 1
              : null;

    if (next === null) return;

    event.preventDefault();
    onSelect(TABS[next]!.id);
    ref.current?.parentElement?.querySelectorAll("button")[next]?.focus();
  }

  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      id={`description-tab-${entry.id}`}
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      onKeyDown={onKeyDown}
      onClick={() => onSelect(entry.id)}
      className={`h-7 rounded-[3px] px-3 text-[12px] font-medium transition-colors ${
        selected ? "bg-mist text-ink" : "text-ink-62 hover:text-ink"
      }`}
    >
      {entry.label}
    </button>
  );
}

const LABEL =
  "text-[13px] font-bold leading-[16.9px] tracking-[-0.076px] text-ink";
