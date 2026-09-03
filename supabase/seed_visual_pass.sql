-- ─────────────────────────────────────────────────────────────────────────
-- Everypaw — Jeu de données pour la passe visuelle des phases 1 et 2
-- ─────────────────────────────────────────────────────────────────────────
--
-- OBJET : donner à un compte de test de quoi exercer d'un seul coup la carte
--         livre (P1-1), le rattrapage des mois (P1-2), la page de commande
--         remplie (P1-3) et le pied de page mémorial (P2-3).
--
-- USAGE : éditeur SQL Supabase. Rejouable : chaque exécution efface les deux
--         animaux qu'il crée pour ce compte, puis les recrée. Les dates sont
--         relatives à aujourd'hui, donc le jeu reste valable dans six mois.
--
-- ⚠️ ÉCRIT DANS LA BASE DE PRODUCTION. Ne le lancer que sur un compte de test.
--    Il ne désactive AUCUN trigger : `trg_enforce_free_entry_limit` refuserait
--    la onzième entrée d'un compte gratuit, donc le plan est passé à `print`
--    avant les insertions. C'est aussi ce qui donne le crédit livre.
-- ─────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_email    text := 'testopera@yopmail.com';   -- ← le seul réglage
  v_user     uuid;
  v_pet      uuid;
  v_gone     uuid;
  v_month    date;
  v_day      date;
  v_offset   int;
  v_index    int;
  v_photos   text[];
BEGIN
  SELECT id INTO v_user FROM profiles WHERE email = v_email;
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Compte % introuvable. Créez-le d''abord, ou corrigez v_email.', v_email;
  END IF;

  -- Le plan d'abord : le trigger de limite d'entrées du plan gratuit refuserait
  -- la onzième insertion, et la page de commande a besoin d'un crédit.
  UPDATE profiles
     SET plan = 'print', is_premium = true, book_credits = 1
   WHERE id = v_user;

  -- Table rase des deux animaux de ce script, pour ce compte seulement.
  FOR v_pet IN SELECT id FROM pets WHERE user_id = v_user AND name IN ('Biscotte', 'Nougat') LOOP
    DELETE FROM milestones WHERE pet_id = v_pet;
    DELETE FROM stories    WHERE pet_id = v_pet;
    DELETE FROM entries    WHERE pet_id = v_pet;
    DELETE FROM events_log WHERE pet_id = v_pet;
    DELETE FROM pets       WHERE id = v_pet;
  END LOOP;

  -- ── L'animal vivant, celui qui porte tout ───────────────────────────────
  INSERT INTO pets (user_id, name, species, breed, birthdate, photo_url, bio)
  VALUES (
    v_user, 'Biscotte', 'dog', 'Border collie',
    (current_date - interval '5 years')::date,
    'https://picsum.photos/seed/biscotte/600/600',
    'Ronge les chaussons, garde le canapé, aboie sur les sacs plastiques.'
  )
  RETURNING id INTO v_pet;

  -- Neuf mois écoulés. Un mois sur deux au début reçoit un chapitre, les
  -- suivants n'en ont pas : c'est ce que la carte de rattrapage doit proposer.
  FOR v_offset IN 1..9 LOOP
    v_month := (date_trunc('month', current_date) - (v_offset || ' months')::interval)::date;

    -- Le mois le plus ancien n'a que deux entrées : il doit apparaître dans la
    -- liste des mois trop courts, jamais dans les mois générables.
    FOR v_index IN 1..(CASE WHEN v_offset = 9 THEN 2 ELSE 4 END) LOOP
      v_day := v_month + ((v_index * 6) || ' days')::interval;

      -- Les mois sans chapitre portent les photos : ce sont elles qui doivent
      -- se paginer deux par page dans le livre.
      v_photos := CASE
        WHEN v_offset <= 6 THEN ARRAY[
          'https://picsum.photos/seed/b' || v_offset || v_index || 'a/900/900',
          'https://picsum.photos/seed/b' || v_offset || v_index || 'b/900/900'
        ]
        ELSE ARRAY[]::text[]
      END;

      INSERT INTO entries (pet_id, user_id, content, photo_urls, mood, tags, entry_date)
      VALUES (
        v_pet, v_user,
        'Entrée de test du ' || to_char(v_day, 'DD/MM/YYYY') || '. Biscotte a couru, dormi, et réclamé son dîner une heure trop tôt.',
        v_photos,
        (ARRAY['happy','calm','playful','sleepy'])[1 + (v_index % 4)],
        ARRAY['test'],
        v_day::date
      );
    END LOOP;

    -- Deux chapitres seulement, sur les deux mois les plus anciens qui ont
    -- quatre entrées : tout le reste devient du rattrapage à proposer.
    IF v_offset IN (7, 8) THEN
      INSERT INTO stories (pet_id, user_id, title, content, period_start, period_end, style, status)
      VALUES (
        v_pet, v_user,
        'Le mois de ' || to_char(v_month, 'TMMonth YYYY'),
        E'Ce mois-là, Biscotte a décidé que le facteur était une menace.\n\nElle a monté la garde chaque matin, puis s''est endormie sur le paillasson à onze heures précises.\n\nLe facteur, lui, n''a jamais rien remarqué.',
        v_month,
        (v_month + interval '1 month - 1 day')::date,
        'classic',
        'published'
      );
    END IF;
  END LOOP;

  -- Douze étapes : deux pages dans le livre, huit par page.
  FOR v_index IN 1..12 LOOP
    INSERT INTO milestones (pet_id, user_id, type, title, achieved_at)
    VALUES (
      v_pet, v_user,
      (ARRAY['first_walk','first_bath','first_trip','first_friend'])[1 + (v_index % 4)],
      (ARRAY['Première balade en forêt','Premier bain accepté','Premier voyage en train','Première amitié au parc'])[1 + (v_index % 4)]
        || ' (' || v_index || ')',
      (current_date - ((v_index * 24) || ' days')::interval)::date
    );
  END LOOP;

  -- ── L'animal disparu, pour la page mémorial ─────────────────────────────
  INSERT INTO pets (user_id, name, species, breed, birthdate, photo_url, bio,
                    deceased_at, memorial_message, memorial_photo_url)
  VALUES (
    v_user, 'Nougat', 'cat', 'Européen',
    (current_date - interval '14 years')::date,
    'https://picsum.photos/seed/nougat/600/600',
    'Dormait dans l''évier, refusait les caresses avant midi.',
    (current_date - interval '2 months')::date,
    'Quatorze ans à voler nos places au soleil. La maison est plus silencieuse.',
    'https://picsum.photos/seed/nougat/900/900'
  )
  RETURNING id INTO v_gone;

  INSERT INTO entries (pet_id, user_id, content, photo_urls, mood, tags, entry_date)
  SELECT v_gone, v_user,
         'Souvenir de Nougat, ' || to_char(current_date - (g * 40 || ' days')::interval, 'DD/MM/YYYY') || '.',
         ARRAY['https://picsum.photos/seed/n' || g || '/900/900'],
         'calm', ARRAY['test'],
         (current_date - (g * 40 || ' days')::interval)::date
  FROM generate_series(3, 8) AS g;

  INSERT INTO stories (pet_id, user_id, title, content, period_start, period_end, style, status)
  VALUES (
    v_gone, v_user, 'Les derniers étés',
    E'Nougat choisissait le carreau le plus chaud de la cuisine et n''en bougeait plus.\n\nIl fallait contourner, s''excuser, revenir plus tard.',
    (current_date - interval '10 months')::date,
    (current_date - interval '3 months')::date,
    'classic', 'published'
  );

  RAISE NOTICE 'Compte % : Biscotte (%) et Nougat (%) recréés.', v_email, v_pet, v_gone;
END $$;

-- Vérification, à lancer après coup.
SELECT p.name,
       p.deceased_at,
       (SELECT count(*) FROM entries    e WHERE e.pet_id = p.id) AS entrees,
       (SELECT count(*) FROM stories    s WHERE s.pet_id = p.id) AS chapitres,
       (SELECT count(*) FROM milestones m WHERE m.pet_id = p.id) AS etapes,
       (SELECT coalesce(sum(array_length(e.photo_urls, 1)), 0)
          FROM entries e WHERE e.pet_id = p.id)                  AS photos
  FROM pets p
  JOIN profiles pr ON pr.id = p.user_id
 WHERE pr.email = 'testopera@yopmail.com'
 ORDER BY p.name;

-- ── Pour voir l'encart cadeau de P2-1, qui ne s'affiche qu'en plan gratuit ──
-- Il faut AUSSI que la date soit entre le 15 novembre et le 24 décembre.
--   UPDATE profiles SET plan = 'free', is_premium = false, book_credits = 0
--    WHERE email = 'testopera@yopmail.com';
--
-- ── Remise à zéro complète du compte ────────────────────────────────────────
--   UPDATE profiles SET plan = 'free', is_premium = false, book_credits = 0
--    WHERE email = 'testopera@yopmail.com';
