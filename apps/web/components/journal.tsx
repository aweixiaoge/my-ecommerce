import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";
import { formatPostDate, getPosts } from "@/lib/mock/posts";

export async function Journal() {
  const posts = await getPosts();

  return (
    <section className="py-[72px]">
      <div className="container-content">
        <SectionHeading
          title="From the journal"
          linkLabel="All articles →"
          linkHref="/journal"
        />

        {/*
          `sm`, not `md`: `bar` is 768 now, so a `md:` step would land on the
          same query as `bar:grid-cols-3` and the two would be decided by
          source order rather than by intent. `sm` keeps the intermediate two
          columns where they belong — below the desktop line, on the way up
          from one.
        */}
        <div className="mt-8 grid grid-cols-1 gap-12 sm:grid-cols-2 bar:grid-cols-3">
          {posts.map((post) => (
            <article key={post.id}>
              <p className="text-[13px] font-semibold tracking-[1.364px] uppercase leading-[21.45px] text-ink underline">
                {post.category}
              </p>

              <h3 className="mt-[22px] text-[20px] leading-[30px] font-bold tracking-[-0.449px] text-ink">
                <Link href={`/journal/${post.slug}`} prefetch={false}>
                  {post.title}
                </Link>
              </h3>

              <p className="mt-[22px] text-[15px] leading-[24.75px] tracking-[-0.234px] text-ink">
                {post.excerpt}
              </p>

              <p className="mt-1.5 text-[13px] leading-[21.45px] tracking-[-0.076px] text-ink">
                {formatPostDate(post.publishedAt)}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
