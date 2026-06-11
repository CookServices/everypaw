import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/plan";
import { escapeHtml } from "@/lib/html";
import { verifyCronRoute } from "@/lib/auth";
import { getResendClient } from "@/lib/resend";

// Prompts rotate daily by day-of-year index
const PROMPTS_EN: Record<string, string[]> = {
  dog: [
    "What made your dog's tail wag the hardest today?",
    "Describe your dog's morning routine in detail.",
    "What's your dog's absolute favorite spot in the house — and why do you think they love it?",
    "Did your dog do something funny or unexpected recently? Write it down.",
    "How does your dog greet you when you come home?",
    "What's a habit your dog has that always makes you smile?",
    "Describe your dog's best friend — human, animal, or toy.",
    "Where did you go on your last walk together? What did your dog sniff, chase, or notice?",
    "What does your dog look like when they're dreaming?",
    "What's something your dog taught you without trying?",
  ],
  cat: [
    "Where is your cat's favorite napping spot right now?",
    "Describe the last time your cat did something completely ridiculous.",
    "What does your cat's purr sound like? When do they purr the most?",
    "What's your cat's weirdest habit?",
    "How does your cat ask for food, attention, or playtime?",
    "What toy or object does your cat love most — even if it's not a toy?",
    "Describe your cat's morning in detail.",
    "What does your cat stare at that you can never quite figure out?",
    "Has your cat done anything recently that surprised you?",
    "What's your cat's relationship with sunlight?",
  ],
  default: [
    "What's one small moment from today you'd want to remember in 5 years?",
    "How is your pet doing lately — mood, energy, appetite?",
    "What did you notice about your pet this week that you hadn't before?",
    "Describe your pet's personality in three words, then explain each one.",
    "What's something your pet does every day without fail?",
    "What made you smile about your pet today?",
    "How has your pet changed since you first got them?",
    "What does a typical evening look like for you and your pet?",
    "What's your pet's reaction to something new — a sound, smell, or visitor?",
    "Write about a moment between you and your pet that words almost can't capture.",
  ],
};

const PROMPTS_FR: Record<string, string[]> = {
  dog: [
    "Qu'est-ce qui a fait remuer la queue de votre chien le plus fort aujourd'hui ?",
    "Décrivez en détail la routine matinale de votre chien.",
    "Quel est l'endroit préféré de votre chien dans la maison — et pourquoi pensez-vous qu'il l'aime autant ?",
    "Votre chien a-t-il fait quelque chose de drôle ou d'inattendu récemment ? Notez-le.",
    "Comment votre chien vous accueille-t-il quand vous rentrez à la maison ?",
    "Quelle habitude de votre chien vous fait toujours sourire ?",
    "Décrivez le meilleur ami de votre chien — humain, animal ou jouet.",
    "Où êtes-vous allés lors de votre dernière promenade ? Qu'est-ce que votre chien a reniflé, chassé ou remarqué ?",
    "À quoi ressemble votre chien quand il rêve ?",
    "Qu'est-ce que votre chien vous a appris sans le savoir ?",
  ],
  cat: [
    "Où est l'endroit de sieste préféré de votre chat en ce moment ?",
    "Décrivez la dernière fois que votre chat a fait quelque chose de complètement ridicule.",
    "Comment ronronne votre chat ? Quand ronronne-t-il le plus ?",
    "Quelle est la manie la plus bizarre de votre chat ?",
    "Comment votre chat demande-t-il de la nourriture, de l'attention ou du jeu ?",
    "Quel jouet ou objet votre chat aime-t-il le plus — même si ce n'est pas un jouet ?",
    "Décrivez la matinée de votre chat en détail.",
    "Qu'est-ce que votre chat fixe du regard et que vous n'arrivez jamais à comprendre ?",
    "Votre chat a-t-il fait quelque chose récemment qui vous a surpris ?",
    "Quelle est la relation de votre chat avec la lumière du soleil ?",
  ],
  default: [
    "Quel petit moment d'aujourd'hui aimeriez-vous vous rappeler dans 5 ans ?",
    "Comment va votre animal en ce moment — humeur, énergie, appétit ?",
    "Qu'avez-vous remarqué chez votre animal cette semaine que vous n'aviez pas vu avant ?",
    "Décrivez la personnalité de votre animal en trois mots, puis expliquez chacun.",
    "Qu'est-ce que votre animal fait chaque jour sans exception ?",
    "Qu'est-ce qui vous a fait sourire chez votre animal aujourd'hui ?",
    "Comment votre animal a-t-il changé depuis que vous l'avez eu ?",
    "À quoi ressemble une soirée typique avec votre animal ?",
    "Quelle est la réaction de votre animal face à quelque chose de nouveau — un son, une odeur, un visiteur ?",
    "Écrivez un moment entre vous et votre animal que les mots peinent presque à capturer.",
  ],
};

function pickPrompt(prompts: string[], dayOfYear: number): string {
  return prompts[dayOfYear % prompts.length];
}

export async function GET(req: Request) {
  const authError = verifyCronRoute(req);
  if (authError) return authError;

  const supabase = getServiceSupabase();
  const resend = getResendClient();

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const startOfYear = new Date(today.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((today.getTime() - startOfYear.getTime()) / 864e5);

  // Fetch profiles with reminders on
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, language, unsubscribe_token")
    .eq("email_reminders", true);

  if (!profiles || profiles.length === 0) return NextResponse.json({ sent: 0 });

  let sent = 0;

  for (const profile of profiles) {
    if (!profile.email) continue;

    // Skip users who already added an entry today
    const { data: todayEntries } = await supabase
      .from("entries")
      .select("id")
      .eq("user_id", profile.id)
      .eq("entry_date", todayStr)
      .limit(1);

    if (todayEntries && todayEntries.length > 0) continue;

    // Skip users who have no pets or no entries at all (never used the app)
    const { data: pets } = await supabase
      .from("pets")
      .select("id, name, species")
      .eq("user_id", profile.id)
      .is("deceased_at", null)
      .limit(1);

    if (!pets || pets.length === 0) continue;

    const { count } = await supabase
      .from("entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id);

    if (!count || count === 0) continue;

    const isFR = (profile.language ?? "en").toLowerCase().startsWith("fr");
    const pet = pets[0];
    const petName = escapeHtml(pet.name);
    const species = (pet.species ?? "").toLowerCase();
    const speciesKey = species.includes("dog") || species.includes("chien") ? "dog"
      : species.includes("cat") || species.includes("chat") ? "cat"
      : "default";

    const prompts = isFR ? PROMPTS_FR[speciesKey] : PROMPTS_EN[speciesKey];
    const prompt = pickPrompt(prompts, dayOfYear);
    const unsubscribeUrl = profile.unsubscribe_token
      ? `https://everypaw.app/unsubscribe?token=${profile.unsubscribe_token}`
      : "https://everypaw.app/dashboard";

    const subject = isFR
      ? `✍️ Prompt du jour pour ${petName}`
      : `✍️ Today's writing prompt for ${petName}`;

    const html = isFR ? `
      <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #3D2B1F;">
        <p style="font-size: 28px; margin: 0 0 8px;">✍️</p>
        <p style="font-size: 12px; font-family: sans-serif; font-weight: 500; letter-spacing: .08em; text-transform: uppercase; color: #C8813A; margin: 0 0 12px;">Prompt du jour</p>
        <div style="background: #F7F2EA; border-left: 3px solid #C8813A; padding: 20px 24px; border-radius: 0 12px 12px 0; margin: 0 0 28px; font-size: 18px; font-style: italic; line-height: 1.6; color: #3D2B1F;">
          ${escapeHtml(prompt)}
        </div>
        <a href="https://everypaw.app/dashboard" style="display: inline-block; background: #C8813A; color: #FDFAF5; padding: 12px 24px; border-radius: 100px; text-decoration: none; font-family: sans-serif; font-size: 14px; font-weight: 500;">
          Écrire pour ${petName} →
        </a>
        <p style="font-size: 11px; color: #9A8070; margin-top: 32px; font-family: sans-serif; line-height: 1.5;">
          <a href="${unsubscribeUrl}" style="color: #9A8070;">Se désabonner des rappels</a>
        </p>
      </div>
    ` : `
      <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #3D2B1F;">
        <p style="font-size: 28px; margin: 0 0 8px;">✍️</p>
        <p style="font-size: 12px; font-family: sans-serif; font-weight: 500; letter-spacing: .08em; text-transform: uppercase; color: #C8813A; margin: 0 0 12px;">Today's prompt</p>
        <div style="background: #F7F2EA; border-left: 3px solid #C8813A; padding: 20px 24px; border-radius: 0 12px 12px 0; margin: 0 0 28px; font-size: 18px; font-style: italic; line-height: 1.6; color: #3D2B1F;">
          ${escapeHtml(prompt)}
        </div>
        <a href="https://everypaw.app/dashboard" style="display: inline-block; background: #C8813A; color: #FDFAF5; padding: 12px 24px; border-radius: 100px; text-decoration: none; font-family: sans-serif; font-size: 14px; font-weight: 500;">
          Write for ${petName} →
        </a>
        <p style="font-size: 11px; color: #9A8070; margin-top: 32px; font-family: sans-serif; line-height: 1.5;">
          <a href="${unsubscribeUrl}" style="color: #9A8070;">Unsubscribe from reminders</a>
        </p>
      </div>
    `;

    await resend.emails.send({
      from: "Everypaw <hello@everypaw.app>",
      to: profile.email,
      subject,
      html,
    });

    sent++;
  }

  return NextResponse.json({ sent });
}
