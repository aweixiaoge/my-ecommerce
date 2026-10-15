const ITEMS = [
  {
    title: "Free shipping over $50",
    body: "Standard delivery in 5–7 business days.",
  },
  {
    title: "30-day returns",
    body: "Changed your mind? Send it back for a full refund.",
  },
  {
    title: "Hand-tested products",
    body: "Every item is used and critiqued by our team first.",
  },
  {
    title: "Real support",
    body: "Questions before or after you buy? Talk to us.",
  },
];

export function TrustBar() {
  return (
    <section className="border-y-[0.909px] border-line">
      {/* Four equal columns on the design's 1290 column with a 40px gap. */}
      <div className="container-content grid grid-cols-1 gap-8 py-10 sm:grid-cols-2 bar:grid-cols-4 bar:gap-10">
        {ITEMS.map((item) => (
          <div key={item.title}>
            <p className="text-[15px] font-semibold leading-[24.75px] tracking-[-0.234px] text-ink">
              {item.title}
            </p>
            <p className="mt-1.5 text-[14px] leading-[23.1px] tracking-[-0.150px] text-ink-60">
              {item.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
