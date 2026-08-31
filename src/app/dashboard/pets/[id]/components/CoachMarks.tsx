"use client";

import CoachMark from "@/components/CoachMark";

export default function CoachMarks({
  isFR, petId, entryCount, storyCount, userPlan, bookCredits,
}: {
  isFR: boolean;
  petId: string;
  entryCount: number;
  storyCount: number;
  userPlan: string;
  bookCredits: number;
}) {
  return (
    <>
      {/* 1. First entry added → push to generate AI story */}
      {entryCount >= 1 && storyCount === 0 && (
        <CoachMark
          id="first_entry"
          isFR={isFR}
          title={isFR ? "✨ Génère ta première histoire IA" : "✨ Generate your first AI story"}
          body={isFR
            ? "Tu as ajouté ta première entrée ! Rends-toi dans l'onglet Histoires pour créer un récit magique."
            : "You added your first entry! Head to the Stories tab to create a magical narrative."}
          cta={isFR ? "Voir les histoires" : "See stories"}
          ctaHref={`/dashboard/pets/${petId}?tab=stories`}
          delay={1500}
        />
      )}

      {/* 2. First story generated → push to create book */}
      {storyCount >= 1 && (
        <CoachMark
          id="first_story"
          isFR={isFR}
          title={isFR ? "📖 Ton livre prend forme" : "📖 Your book is taking shape"}
          body={isFR
            ? "Avec plusieurs histoires, tu peux créer un livre imprimé. Plus tu en génères, plus le livre sera riche."
            : "With several stories, you can create a printed book. The more you generate, the richer it gets."}
          cta={isFR ? "Créer mon livre" : "Create my book"}
          ctaHref={`/dashboard/pets/${petId}/order`}
          delay={2000}
        />
      )}

      {/* 3. Print plan with unused book credit */}
      {userPlan === "print" && bookCredits > 0 && (
        <CoachMark
          id="book_credit"
          isFR={isFR}
          title={isFR ? "🎁 Tu as un livre offert !" : "🎁 You have a free book!"}
          body={isFR
            ? "Ton abonnement Print inclut un livre offert par an. Il t'attend, commence ta configuration."
            : "Your Print plan includes one free book per year. It's waiting for you, start your configuration."}
          cta={isFR ? "Configurer mon livre" : "Configure my book"}
          ctaHref={`/dashboard/pets/${petId}/order`}
          delay={2500}
        />
      )}
    </>
  );
}
