import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import { getProfile } from "@/lib/data";
import {
  About,
  SelectedWork,
  MoreProjects,
  Experience,
  Education,
  Contributions,
  PraiseSection,
  Contact,
} from "@/components/sections";

export default function Home() {
  const profile = getProfile();
  return (
    <>
      <span id="top" />
      <Nav name={profile.name} />
      <div className="mx-auto max-w-[1080px]">
        <main className="px-4 sm:px-6">
          <Hero />
          <About />
          <SelectedWork />
          <MoreProjects />
          <Experience />
          <Education />
          <Contributions />
          <PraiseSection />
          <Contact />
        </main>
      </div>
    </>
  );
}
