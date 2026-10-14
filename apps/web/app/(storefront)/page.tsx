import { ContactCta } from "@/components/contact-cta";
import { Hero } from "@/components/hero";
import { Journal } from "@/components/journal";
import { NewArrivals } from "@/components/new-arrivals";
import { TrustBar } from "@/components/trust-bar";
import { WhyBuy } from "@/components/why-buy";

export default function HomePage() {
  return (
    <>
      <Hero />
      <TrustBar />
      <NewArrivals />
      <WhyBuy />
      <Journal />
      <ContactCta />
    </>
  );
}
