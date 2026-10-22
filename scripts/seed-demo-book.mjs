/**
 * Remplit un compte de test avec un livre présentable : chapitres écrits,
 * étapes nommées, entrées datées. Sert deux buts à la fois, la commande Gelato
 * réelle et un objet montrable.
 *
 *   node scripts/seed-demo-book.mjs                  # contenu seulement
 *   node scripts/seed-demo-book.mjs --photos ./dir   # + envoie les images du
 *                                                    #   dossier dans Supabase
 *                                                    #   et les répartit
 *
 * Lit SUPABASE_SERVICE_ROLE_KEY dans .env.local. N'écrit que sur le compte
 * ciblé et sur son animal nommé Biscotte. Rejouable.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { createClient } from "@supabase/supabase-js";

const EMAIL = "testopera@yopmail.com";
const PET = "Biscotte";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

/** Six chapitres. Le troisième est long exprès : il doit tenir sur deux pages. */
const CHAPTERS = [
  {
    title: "Le mois où tout était trop grand",
    body: [
      "Elle est arrivée un mardi, dans une caisse qui sentait le carton neuf et le vétérinaire.",
      "Le couloir lui a paru immense. Le canapé, une falaise. Elle a passé la première heure sous la table basse, à surveiller nos pieds comme on surveille une météo.",
      "Puis elle a trouvé le tapis près du radiateur, et elle a décidé que ce serait chez elle. Elle y est restée trois jours. On lui apportait sa gamelle en marchant lentement, comme on approche un animal sauvage, ce qu'elle était encore un peu.",
      "Le quatrième jour, elle a aboyé sur une chaussure. C'était son premier avis sur le monde.",
    ].join("\n\n"),
  },
  {
    title: "L'école du jardin",
    body: [
      "Le printemps lui a appris qu'il existait un dehors, et que ce dehors était plein de choses à mordre.",
      "Elle a commencé par les feuilles mortes, ce qui était sans conséquence. Elle est passée aux arrosoirs, ce qui l'était moins. Elle a fini par le tuyau d'arrosage, un mardi, pendant qu'on téléphonait.",
      "On a mis longtemps à comprendre qu'elle ne détruisait rien par bêtise. Elle vérifiait. Chaque objet du jardin devait passer un examen, et l'examen consistait à savoir s'il résistait aux dents.",
      "Le tuyau n'a pas résisté. Le tuyau n'était pas digne du jardin.",
    ].join("\n\n"),
  },
  {
    title: "Ce mois-là, le facteur était une menace",
    body: [
      "Il faut comprendre la logique. Un homme arrive chaque matin, dépose des objets dans une boîte qui nous appartient, et repart sans se justifier. N'importe quel chien sérieux trouverait cela suspect.",
      "Elle a donc monté la garde. À partir du 3, elle prenait son poste à huit heures, derrière la porte vitrée, immobile. Le facteur arrivait vers dix heures et quart. Elle avait donc deux heures et quart de vigilance pure, ce qui pour un border collie relève presque du repos.",
      "Le rituel était réglé. Trois aboiements à l'approche du portail, un silence pendant qu'il ouvrait la boîte, puis deux aboiements de conclusion, plus graves, qui signifiaient quelque chose comme voilà, c'est noté.",
      "Ensuite elle allait dormir sur le paillasson, à onze heures précises, avec la satisfaction du travail accompli.",
      "Le plus remarquable, c'est qu'elle n'a jamais montré la moindre agressivité. Elle ne voulait pas mordre le facteur. Elle voulait qu'il sache qu'elle savait. C'est une nuance que beaucoup d'humains ne font pas.",
      "Un jour de la fin du mois, le facteur a sonné pour un colis. On a ouvert. Elle l'a regardé entrer, elle a reniflé son pantalon, elle est retournée se coucher. Le dossier était clos. Elle ne s'est plus jamais postée derrière la vitre.",
      "On a mis un moment à s'en remettre, nous. Elle, non.",
    ].join("\n\n"),
  },
  {
    title: "L'été des flaques",
    body: [
      "Elle a découvert l'eau par accident, en poursuivant une abeille jusque dans la bassine des tomates.",
      "Sa réaction n'a pas été la peur mais l'indignation. Elle est ressortie trempée, elle nous a regardés comme si nous avions organisé le piège, puis elle y est retournée d'elle-même.",
      "À partir de là, chaque flaque du chemin était un rendez-vous. On a marché tout l'été derrière un chien qui ne prenait jamais le trajet le plus court.",
    ].join("\n\n"),
  },
  {
    title: "Le mois des vieilles habitudes",
    body: [
      "Il y a un moment, chez un chien, où les découvertes ralentissent et où les habitudes prennent le relais. C'est arrivé cet automne, sans qu'on le remarque tout de suite.",
      "Elle avait son fauteuil, son heure, son côté du lit. Elle savait quel bruit de clé était le nôtre et lequel appartenait au voisin.",
      "Ce sont des choses qu'on ne pense pas à noter, parce qu'elles ne ressemblent pas à des événements. Ce sont pourtant elles qui manquent le plus, après.",
    ].join("\n\n"),
  },
  {
    title: "Décembre, et la neige qu'elle n'attendait pas",
    body: [
      "Elle a passé la première demi-heure à essayer de comprendre pourquoi le sol avait changé d'avis.",
      "Puis elle a couru. Elle a couru comme elle n'avait plus couru depuis le jardin de ses six mois, en ligne droite, sans but, avec de la neige jusqu'au poitrail.",
      "On l'a laissée faire jusqu'à ce qu'elle s'arrête d'elle-même, essoufflée, ridicule et heureuse.",
      "C'est cette image-là qu'on garde de cette année.",
    ].join("\n\n"),
  },
];

const MILESTONES = [
  ["first_home", "Premier jour à la maison"],
  ["first_walk", "Première balade sans laisse"],
  ["first_friend", "Première amitié au parc"],
  ["first_bath", "Premier bain accepté"],
  ["first_trip", "Premier voyage en train"],
  ["first_swim", "Première baignade"],
  ["first_snow", "Première neige"],
  ["first_trick", "A appris à donner la patte"],
  ["first_guard", "A décrété que le facteur était une menace"],
  ["first_night", "Première nuit sans pleurer"],
  ["first_vet", "Première visite chez le vétérinaire"],
  ["first_birthday", "Premier anniversaire"],
];

const MOMENTS = [
  "Elle a dormi tout l'après-midi dans le rayon de soleil, en changeant de place trois fois pour le suivre.",
  "Refus catégorique de rentrer sous la pluie. On a attendu ensemble sous le porche.",
  "A rapporté la balle deux fois, puis a estimé que c'était à notre tour de courir.",
  "Longue séance d'observation du chat des voisins, sans un bruit, pendant vingt minutes.",
  "A volé un quignon de pain sur la table basse avec une discrétion remarquable.",
  "Promenade au bord de l'eau. Elle a mis les pattes avant, jamais les arrière.",
  "S'est endormie contre la porte d'entrée en attendant qu'on rentre.",
  "A découvert que le carrelage de la cuisine était frais. Nouvelle place attitrée.",
  "Course dans les feuilles mortes, à l'aveugle, jusqu'à percuter un banc.",
  "A refusé son panier pour dormir sur le pull qui traînait par terre.",
  "Première fois qu'elle a rapporté le journal, plié en deux, un peu mâché.",
  "A passé la soirée à surveiller le sac de courses sans jamais y toucher.",
];

async function main() {
  const photosIndex = process.argv.indexOf("--photos");
  const photosDir = photosIndex > -1 ? process.argv[photosIndex + 1] : null;

  const { data: profile } = await db.from("profiles").select("id").eq("email", EMAIL).single();
  if (!profile) throw new Error(`compte ${EMAIL} introuvable`);
  const { data: pet } = await db
    .from("pets").select("id").eq("user_id", profile.id).eq("name", PET).single();
  if (!pet) throw new Error(`${PET} introuvable sur ce compte`);

  // ── Photos, seulement si un dossier est fourni ──────────────────────────
  const uploaded = [];
  if (photosDir) {
    const files = readdirSync(photosDir)
      .filter((f) => [".jpg", ".jpeg", ".png", ".webp"].includes(extname(f).toLowerCase()))
      .sort();
    if (files.length === 0) throw new Error(`aucune image dans ${photosDir}`);
    for (const file of files) {
      const bytes = readFileSync(join(photosDir, file));
      const clean = basename(file).toLowerCase().replace(/[^a-z0-9.]/g, "-");
      const path = `${profile.id}/demo-${clean}`;
      const { error } = await db.storage.from("pet-photos").upload(path, bytes, {
        contentType: extname(file).toLowerCase() === ".png" ? "image/png" : "image/jpeg",
        upsert: true,
      });
      if (error) throw error;
      uploaded.push(db.storage.from("pet-photos").getPublicUrl(path).data.publicUrl);
    }
    console.log(`photos envoyées : ${uploaded.length}`);

    // La couverture du livre lit pet.photo_url : sans ça elle garderait le
    // paysage du jeu de données et le reste du livre montrerait un chien.
    const { error: coverError } = await db
      .from("pets").update({ photo_url: uploaded[0] }).eq("id", pet.id);
    if (coverError) throw coverError;
  }

  // ── Chapitres ────────────────────────────────────────────────────────────
  const { data: old } = await db.from("stories").select("id").eq("pet_id", pet.id);
  for (const s of old ?? []) await db.from("stories").delete().eq("id", s.id);

  for (const [i, ch] of CHAPTERS.entries()) {
    const ref = new Date();
    ref.setMonth(ref.getMonth() - (CHAPTERS.length - i));
    const first = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const last = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
    const { error } = await db.from("stories").insert({
      pet_id: pet.id,
      user_id: profile.id,
      title: ch.title,
      content: ch.body,
      period_start: first.toISOString().slice(0, 10),
      period_end: last.toISOString().slice(0, 10),
      style: "classic",
      status: "published",
    });
    if (error) throw error;
  }

  // ── Étapes ───────────────────────────────────────────────────────────────
  await db.from("milestones").delete().eq("pet_id", pet.id);
  for (const [i, [type, title]] of MILESTONES.entries()) {
    const d = new Date();
    d.setDate(d.getDate() - (i + 1) * 26);
    const { error } = await db.from("milestones").insert({
      pet_id: pet.id,
      user_id: profile.id,
      type,
      title,
      achieved_at: d.toISOString().slice(0, 10),
    });
    if (error) throw error;
  }

  // ── Entrées ──────────────────────────────────────────────────────────────
  // La répartition n'est pas cosmétique. Une photo dont la date tombe dans la
  // période d'un chapitre est composée DANS ce chapitre (quatre au plus) et ne
  // fait aucune page ; seules les photos qu'aucun chapitre ne réclame se
  // paginent, deux par page. Les photos vont donc en priorité aux entrées hors
  // période, sinon elles disparaissent dans les chapitres et le livre maigrit.
  const { data: entries } = await db
    .from("entries").select("id, entry_date").eq("pet_id", pet.id).order("entry_date");

  const { data: periods } = await db
    .from("stories").select("period_start, period_end").eq("pet_id", pet.id);

  /** Miroir de bestStoryIndexForDate : un chapitre réclame la date qu'il couvre. */
  const claimed = (date) => (periods ?? []).some((p) => {
    const d = date.slice(0, 10);
    return p.period_start && d >= p.period_start && (!p.period_end || d <= p.period_end);
  });

  const orphanEntries = (entries ?? []).filter((e) => !claimed(e.entry_date));
  const insideEntries = (entries ?? []).filter((e) => claimed(e.entry_date));

  const plan = new Map();
  if (uploaded.length > 0) {
    let cursor = 0;
    const next = (n) => {
      const out = [];
      for (let k = 0; k < n && cursor < uploaded.length; k += 1, cursor += 1) out.push(uploaded[cursor]);
      return out;
    };
    // Une poignée pour illustrer les chapitres, le reste aux entrées hors
    // période : ce sont les seules qui fabriquent des pages.
    const forChapters = Math.min(CHAPTERS.length, Math.floor(uploaded.length * 0.15));
    const chapterPicks = insideEntries.slice(0, forChapters);
    for (const e of chapterPicks) plan.set(e.id, next(1));

    const remaining = uploaded.length - cursor;
    const perOrphan = Math.max(1, Math.ceil(remaining / Math.max(orphanEntries.length, 1)));
    for (const e of orphanEntries) plan.set(e.id, next(perOrphan));
    // Tout ce qui reste après ça retombe sur les dernières entrées hors période.
    for (const e of orphanEntries) {
      if (cursor >= uploaded.length) break;
      plan.set(e.id, [...(plan.get(e.id) ?? []), ...next(2)]);
    }
  }

  for (const [i, e] of (entries ?? []).entries()) {
    const patch = { content: MOMENTS[i % MOMENTS.length] };
    if (uploaded.length > 0) patch.photo_urls = plan.get(e.id) ?? [];
    const { error } = await db.from("entries").update(patch).eq("id", e.id);
    if (error) throw error;
  }

  const { data: check } = await db.from("stories").select("content").eq("pet_id", pet.id);
  console.log("chapitres :", check.map((c) => `${c.content.length} car.`).join(", "));
  console.log("étapes    :", MILESTONES.length);
  console.log("entrées   :", (entries ?? []).length);

  // Ce que le livre fera, avant d'engager une commande. Reproduit paginateBook :
  // chapitres selon leur texte et les photos qu'ils absorbent, photos orphelines
  // 2 par page (plafond 30 pages), étapes 8 par page, complément final au
  // multiple de 4, minimum 28.
  const { data: after } = await db
    .from("entries").select("entry_date, photo_urls").eq("pet_id", pet.id);

  let orphanPhotos = 0;
  let insidePhotos = 0;
  for (const e of after ?? []) {
    const n = e.photo_urls?.length ?? 0;
    if (claimed(e.entry_date)) insidePhotos += n; else orphanPhotos += n;
  }

  const chapterPages = check.reduce((n, c) => {
    // Capacité de la première page : 2000 caractères, moins 640 par rangée de
    // deux photos composées dans le chapitre.
    const capacity = 2000 - Math.ceil(Math.min(4, 2) / 2) * 640;
    return n + 1 + Math.ceil(Math.max(0, c.content.trim().length - capacity) / 2000);
  }, 0);
  const photoPages = Math.ceil(Math.min(orphanPhotos, 60) / 2);
  const milestonePages = Math.ceil(MILESTONES.length / 8);
  const content = chapterPages + photoPages + milestonePages;
  const declared = Math.max(28, Math.ceil(content / 4) * 4);

  console.log(`photos    : ${orphanPhotos + insidePhotos} (${orphanPhotos} en pages, ${insidePhotos} dans les chapitres)`);
  console.log(
    `livre     : ${chapterPages} p. chapitres + ${photoPages} p. photos + ${milestonePages} p. étapes`
    + ` = ${content} remplies, ${declared} déclarées, ${declared - content} blanches`,
  );
  if (content < 14) console.log("ATTENTION : sous le seuil de commande de 14 pages remplies");
  if (!photosDir) {
    console.log("\nphotos    : inchangées. Relancer avec --photos <dossier> pour les remplacer.");
  }
}

main().catch((e) => {
  console.error("ERREUR:", e.message);
  process.exit(1);
});
