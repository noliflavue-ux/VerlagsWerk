import type { PillarId } from '../types/book';

export interface BookIdeaProposal {
  id: string;
  pillar: PillarId;
  title: string;
  subtitle: string;
  targetAudience: string;
  corePromise: string;
  marketAngle: string;
  sampleChapters: string[];
}

export const CURATED_BOOK_IDEAS: BookIdeaProposal[] = [
  // GELD
  {
    id: 'idea-geld-1',
    pillar: 'geld',
    title: 'Gehalt neu verhandeln',
    subtitle: 'Mit ruhiger Vorbereitung und klaren Zahlen zu 15 % mehr Einkommen im Jahresgespräch',
    targetAudience: 'Angestellte und Fachkräfte (26–48 Jahre), die ihren Marktwert sicher vertreten wollen',
    corePromise: 'Ein 14-Tage-Vorbereitungssystem mit Gesprächsleitfäden, Einwand-Antworten und konkreter Wert-Dokumentation.',
    marketAngle: 'Hohe ganzjährige Suchnachfrage auf Amazon.de rund um Gehaltsverhandlung und Karriereplanung.',
    sampleChapters: [
      'Warum Bescheidenheit im Gehaltsgespräch teuer wird',
      'Den eigenen Marktwert sauber beziffern',
      'Das Wert-Dossier: Erfolge in Zahlen übersetzen',
      'Gesprächsführung ohne Druck und Rechtfertigung',
      'Einwände professionell abfangen und Alternativen verhandeln',
    ],
  },
  {
    id: 'idea-geld-2',
    pillar: 'geld',
    title: 'Nebenbei unabhängig',
    subtitle: 'Wie Sie neben dem Hauptberuf mit 5 Stunden pro Woche ein zweites digitales Einkommen aufbauen',
    targetAudience: 'Berufstätige (30–50 Jahre), die sich ohne Kündigungsrisiko finanziell breiter aufstellen wollen',
    corePromise: 'Ein realistischer Fahrplan von der ersten bezahlten Dienstleistung oder Publikation bis zu 1.000 € Nebeneinkommen.',
    marketAngle: 'Starkes Bedürfnis nach Einkommenssicherheit ohne reißerische "Schnell-reich"-Versprechen.',
    sampleChapters: [
      'Das Risiko einer einzigen Einkommensquelle',
      'Fähigkeiten finden, für die Kunden sofort zahlen',
      'Das 5-Stunden-Wochensystem neben dem Job',
      'Steuern, Gewerbe und saubere Trennung von Beginn an',
      'Vom ersten Kunden zu planbaren wiederkehrenden Einnahmen',
    ],
  },
  {
    id: 'idea-geld-3',
    pillar: 'geld',
    title: 'Schuldenfrei in klaren Schritten',
    subtitle: 'Raus aus Dispo, Ratenkäufen und Finanzdruck – zurück zu echter Handlungsfreiheit',
    targetAudience: 'Haushalte und Berufstätige mit laufenden Konsumkrediten, die wieder ruhig schlafen wollen',
    corePromise: 'Ein schamfreier 90-Tage-Sanierungsplan mit Schneeball-Tilgung und sofort wirksamen Fixkosten-Hebeln.',
    marketAngle: 'Akuter Leidensdruck in wirtschaftlich angespannten Zeiten mit hoher Kaufbereitschaft für seriöse Hilfe.',
    sampleChapters: [
      'Bestandsaufnahme ohne Schuldgefühle',
      'Die sofortige Stopp-Regel für Dispo und Konsumraten',
      'Schneeball vs. Lawine: Welche Tilgung Sie wirklich durchhalten',
      'Gespräche mit Banken und Gläubigern souverän führen',
      'Der erste Schutzgroschen für dauerhafte Schuldenfreiheit',
    ],
  },
  {
    id: 'idea-geld-4',
    pillar: 'geld',
    title: 'Finanzen für Paare',
    subtitle: 'Gemeinsam planen, fair teilen und ohne Geldstreit Vermögen aufbauen',
    targetAudience: 'Paare und junge Familien (28–45 Jahre) beim Zusammenziehen, Heiraten oder Elternzeit-Planen',
    corePromise: 'Ein faires 3-Konten-Partnermodell inklusive Gesprächsagenda für monatliche Finanz-Check-ins ohne Streit.',
    marketAngle: 'Verbindet die zwei stärksten Grundbedürfnisse Geld und Beziehung in einer lukrativen KDP-Nische.',
    sampleChapters: [
      'Warum Geldgespräche selten nur um Zahlen gehen',
      'Drei faire Kontenmodelle bei unterschiedlichem Einkommen',
      'Elternzeit, Teilzeit und Altersvorsorge gerecht ausgleichen',
      'Der 30-Minuten-Geldabend einmal im Monat',
      'Gemeinsame Ziele: Immobilien, Rücklagen und Freiheit',
    ],
  },

  // BEZIEHUNG
  {
    id: 'idea-bez-1',
    pillar: 'beziehung',
    title: 'Streiten ohne zu verletzen',
    subtitle: 'Wie Paare aus festgefahrenen Konflikten aussteigen und wieder wirklich zuhören',
    targetAudience: 'Paare in mehrjährigen Beziehungen (30–55 Jahre), die wiederkehrende Alltagskonflikte lösen wollen',
    corePromise: 'Konkrete Deeskalations-Sätze und ein 4-Schritte-Klärungsgespräch, das Vorwürfe in echte Nähe verwandelt.',
    marketAngle: 'Dauerbrenner-Thema bei Amazon.de mit hoher Weiterempfehlungsrate und starkem Taschenbuch-Anteil.',
    sampleChapters: [
      'Die unsichtbare Spirale hinter jedem Alltagsstreit',
      'Warum Recht haben Nähe zerstört',
      'Das 15-Minuten-Timeout richtig vereinbaren',
      'Bedürfnisse aussprechen statt Vorwürfe sammeln',
      'Nach dem Konflikt: Reparieren statt verdrängen',
    ],
  },
  {
    id: 'idea-bez-2',
    pillar: 'beziehung',
    title: 'Freundlich Nein sagen',
    subtitle: 'Gesunde Grenzen in Familie, Partnerschaft und Beruf setzen – ohne Schuldgefühle',
    targetAudience: 'Hilfsbereite Menschen (25–55 Jahre), die häufig über ihre eigenen Grenzen gehen',
    corePromise: 'Über 35 praxiserprobte Formulierungen für klare Grenzen, die Respekt stärken statt Beziehungen zu zerstören.',
    marketAngle: 'Stark wachsende KDP-Kategorie im Bereich Psychologie, Selbstbehauptung und gesunde Kommunikation.',
    sampleChapters: [
      'Warum ständiges Ja-Sagen heimlich verbittert',
      'Die drei häufigsten Schuldgefühl-Fallen erkennen',
      'Klare, warme Formulierungen für Familie und Partner',
      'Grenzen im Beruf souverän kommunizieren',
      'Wenn andere Widerstand zeigen: Ruhig bei sich bleiben',
    ],
  },
  {
    id: 'idea-bez-3',
    pillar: 'beziehung',
    title: 'Bindung verstehen, Nähe zulassen',
    subtitle: 'Wie wir alte Beziehungsmuster erkennen und eine sichere Partnerschaft gestalten',
    targetAudience: 'Singles und Paare (28–50 Jahre), die sich wiederholende Nähe-Distanz-Dynamiken durchbrechen wollen',
    corePromise: 'Alltagsnahe Übersetzung der Bindungstheorie in konkrete Übungen für mehr Vertrauen und emotionale Sicherheit.',
    marketAngle: 'Hohe organische Nachfrage nach Bindungsstilen und sicherer Partnerschaft im DACH-Markt.',
    sampleChapters: [
      'Welche unsichtbare Landkarte wir in Beziehungen mitbringen',
      'Nähe-Angst und Verlustangst im Alltag erkennen',
      'Ruhige Selbstregulation in kritischen Momenten',
      'Sichere Kommunikation als neue Gewohnheit',
      'Woran Sie eine wirklich tragfähige Partnerschaft erkennen',
    ],
  },
  {
    id: 'idea-bez-4',
    pillar: 'beziehung',
    title: 'Gespräche, die verbinden',
    subtitle: 'Wie echte Präsenz und gute Fragen aus Routine wieder tiefe Partnerschaft machen',
    targetAudience: 'Langjährige Paare mit vollem Berufs- und Familienalltag',
    corePromise: 'Ein strukturierter Wochenrhythmus mit 60 tiefgehenden Gesprächsimpulsen gegen das stille Nebeneinanderher.',
    marketAngle: 'Hohes Geschenk- und Taschenbuchpotenzial mit direktem praktischem Alltagsnutzen.',
    sampleChapters: [
      'Wie der Alltag leise die Neugier auffrisst',
      'Zuhören ohne sofort Lösungen anzubieten',
      'Kleine Rituale für echte Verbindung unter der Woche',
      'Über Wünsche, Träume und Intimität ehrlich sprechen',
      '60 Fragen für gemeinsame Abende ohne Bildschirm',
    ],
  },

  // GLÜCK
  {
    id: 'idea-glueck-1',
    pillar: 'glueck',
    title: 'Kopf aus, Klarheit an',
    subtitle: 'Grübelschleifen durchbrechen und im Alltag wieder ruhig entscheiden',
    targetAudience: 'Nachdenkliche Berufstätige (28–55 Jahre), die unter Overthinking und innerer Unruhe leiden',
    corePromise: 'Sieben alltagstaugliche Denkwerkzeuge, mit denen Sie abendliches Gedankenkreisen in 10 Minuten beruhigen.',
    marketAngle: 'Top-Suchbegriff "Overthinking / Grübeln stoppen" mit konstant hoher Nachfrage auf Amazon.de.',
    sampleChapters: [
      'Warum Nachdenken plötzlich in Grübeln kippt',
      'Der Unterschied zwischen Problemlösen und Gedankenspiralen',
      'Die 10-Minuten-Schreibtechnik für den Feierabend',
      'Entscheidungsmüdigkeit durch einfache Regeln beenden',
      'Innere Ruhe als tägliche Praxis verankern',
    ],
  },
  {
    id: 'idea-glueck-2',
    pillar: 'glueck',
    title: 'Die Kunst des Genug',
    subtitle: 'Warum weniger Druck, klarere Prioritäten und bewusster Verzicht zu dauerhafter Zufriedenheit führen',
    targetAudience: 'Leistungsorientierte Erwachsene (32–60 Jahre), die trotz Erfolg innere Leere oder Dauerhetze spüren',
    corePromise: 'Ein praktischer Entlastungsplan für Kalender, Konsum und Erwartungen – hin zu einem stimmigen Lebensrhythmus.',
    marketAngle: 'Starkes Gegenbewegungsthema zu Leistungsdruck und Dauererreichbarkeit.',
    sampleChapters: [
      'Die stille Erschöpfung der ständigen Optimierung',
      'Was wirklich trägt: Drei Fragen für ein klares Leben',
      'Den eigenen Kalender radikal entlasten',
      'Vergleiche beenden und eigene Maßstäbe setzen',
      'Rituale der Dankbarkeit ohne Kitsch',
    ],
  },
  {
    id: 'idea-glueck-3',
    pillar: 'glueck',
    title: 'Neustart in der Lebensmitte',
    subtitle: 'Wie Sie mit 40+ neu ausrichten, was zählt – klar, mutig und ohne alles hinzuwerfen',
    targetAudience: 'Menschen zwischen 38 und 58 Jahren in beruflicher oder persönlicher Neuorientierung',
    corePromise: 'Ein strukturiertes Standort-Workbook, das verborgene Stärken klärt und realistische nächste Schritte plant.',
    marketAngle: 'Kaufkräftige Zielgruppe mit hoher Bereitschaft für hochwertige Sachbücher und Taschenbücher.',
    sampleChapters: [
      'Wenn bisherige Ziele nicht mehr tragen',
      'Bilanz ziehen: Was bleiben darf und was gehen muss',
      'Neue Sinnquellen jenseits von Status entdecken',
      'Kleine Experimente statt riskanter Brüche',
      'Ihr 12-Monats-Kompass für die zweite Lebenshälfte',
    ],
  },
  {
    id: 'idea-glueck-4',
    pillar: 'glueck',
    title: 'Stille Stärke im Wandel',
    subtitle: 'Stoische Gelassenheit und moderne Resilienz für unruhige Zeiten',
    targetAudience: 'Leser (30–60 Jahre), die psychologische Stabilität im Berufs- und Alltagsstress suchen',
    corePromise: 'Zeitlose Prinzipien innerer Standhaftigkeit übersetzt in konkrete Morgen- und Abendroutinen.',
    marketAngle: 'Bewährte Evergreen-Nische (Stoizismus & Resilienz) mit stabilen Langfristverkäufen.',
    sampleChapters: [
      'Kontrolle unterscheiden: Was in Ihrer Hand liegt',
      'Gelassen bleiben, wenn Pläne scheitern',
      'Die tägliche Drei-Minuten-Ausrichtung am Morgen',
      'Umgang mit Kritik, Unsicherheit und Tempo',
      'Resilienz im Alltag trainieren statt nur darüber lesen',
    ],
  },

  // GESUNDHEIT
  {
    id: 'idea-ges-1',
    pillar: 'gesundheit',
    title: 'Tiefer Schlaf, klare Tage',
    subtitle: 'Evidenzbasierte Abendroutinen gegen Einschlafprobleme und nächtliches Grübeln',
    targetAudience: 'Berufstätige (30–60 Jahre) mit unruhigem Schlaf, frühem Aufwachen oder Tagesmüdigkeit',
    corePromise: 'Ein 21-Tage-Schlafprotokoll rund um Licht, Temperatur, Nervensystem und Abendrhythmus ohne Medikamente.',
    marketAngle: 'Eines der volumenstärksten Gesundheitsthemen auf Amazon.de mit sofort spürbarem Nutzen.',
    sampleChapters: [
      'Warum guter Schlaf bereits morgens beginnt',
      'Die innere Uhr mit Tageslicht und Timing justieren',
      'Die 60-Minuten-Abendbrücke für ein ruhiges Nervensystem',
      'Was hilft, wenn Sie um drei Uhr nachts wach liegen',
      'Ihr persönlicher 21-Tage-Schlafplan',
    ],
  },
  {
    id: 'idea-ges-2',
    pillar: 'gesundheit',
    title: 'Nervensystem in Balance',
    subtitle: 'Alltagsnahe Vagusnerv- und Atemroutinen gegen Dauerstress und Erschöpfung',
    targetAudience: 'Gestresste Berufstätige und Eltern (28–55 Jahre) mit innerer Anspannung',
    corePromise: 'Fünf-Minuten-Übungen für Schreibtisch, Feierabend und Akutmomente, die messbar Ruhe ins System bringen.',
    marketAngle: 'Sehr starke Nachfrage im Segment Stressregulation & somatische Entspannung.',
    sampleChapters: [
      'Warum der Körper im Dauerstress nicht mehr abschaltet',
      'Atemtechniken, die den Puls in zwei Minuten senken',
      'Mikropausen im Arbeitsalltag wirksam gestalten',
      'Körpersignale frühzeitig lesen und regulieren',
      'Ein nachhaltiges Wochensystem für echte Erholung',
    ],
  },
  {
    id: 'idea-ges-3',
    pillar: 'gesundheit',
    title: 'Stark bleiben ab 40',
    subtitle: 'Das 20-Minuten-System für Muskelkraft, Beweglichkeit und Stoffwechsel ohne Fitnessstudio',
    targetAudience: 'Vielbeschäftigte Frauen und Männer (40–65 Jahre), die gesund altern wollen',
    corePromise: 'Dreimal 20 Minuten pro Woche zu Hause mit klarem Fokus auf Gelenkschutz, Haltung und langfristige Kraft.',
    marketAngle: 'Longevity- und Best-Ager-Gesundheit zählt zu den am stärksten wachsenden KDP-Segmenten.',
    sampleChapters: [
      'Warum Muskelmasse die beste Gesundheitsversicherung ist',
      'Das 20-Minuten-Minimalprinzip für volle Terminkalender',
      'Die sechs Grundbewegungen sicher zu Hause ausführen',
      'Eiweiß, Regeneration und Schlaf pragmatisch verbinden',
      'Dranbleiben über Monate statt vier Wochen Perfektionismus',
    ],
  },
  {
    id: 'idea-ges-4',
    pillar: 'gesundheit',
    title: 'Entspannt essen im Alltag',
    subtitle: 'Blutzucker stabil halten, Heißhunger beenden und ohne Diätregeln mehr Energie gewinnen',
    targetAudience: 'Berufstätige (28–55 Jahre), die nachmittägliche Energietiefs und Diät-Frust hinter sich lassen wollen',
    corePromise: 'Ein unkompliziertes Baukasten-System für Frühstück, Büro-Lunch und Abendessen mit 25 schnellen Ideen.',
    marketAngle: 'Hohe Nachfrage nach alltagstauglicher, diätfreier Ernährung für konstante Energie.',
    sampleChapters: [
      'Warum steile Blutzuckerkurven müde und hungrig machen',
      'Die einfache Reihenfolge-Regel auf dem Teller',
      'Büro, Kantine und unterwegs pragmatisch lösen',
      'Heißhunger am Nachmittag gelassen vorbeugen',
      'Ihr 14-Tage-Alltagsbaukasten ohne Kalorienzählen',
    ],
  },
];

/**
 * Draws random/lucky book proposals, optionally filtered by a specific evergreen pillar,
 * avoiding recently displayed IDs whenever enough fresh candidates exist.
 */
export function drawLuckyBookIdeas(
  pillarFilter: PillarId | 'all',
  count = 3,
  excludeIds: string[] = [],
  rng: () => number = Math.random
): BookIdeaProposal[] {
  const pool =
    pillarFilter === 'all'
      ? CURATED_BOOK_IDEAS
      : CURATED_BOOK_IDEAS.filter((item) => item.pillar === pillarFilter);

  if (pool.length === 0) return [];

  const excludeSet = new Set(excludeIds);
  const freshPool = pool.filter((item) => !excludeSet.has(item.id));
  const source = freshPool.length >= Math.min(count, pool.length) ? freshPool : pool;

  const shuffled = [...source];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // When mixing across all pillars, prefer distinct pillars in the top picks
  if (pillarFilter === 'all' && count <= 4) {
    const picked: BookIdeaProposal[] = [];
    const usedPillars = new Set<PillarId>();
    for (const candidate of shuffled) {
      if (picked.length >= count) break;
      if (!usedPillars.has(candidate.pillar)) {
        picked.push(candidate);
        usedPillars.add(candidate.pillar);
      }
    }
    for (const candidate of shuffled) {
      if (picked.length >= count) break;
      if (!picked.some((p) => p.id === candidate.id)) {
        picked.push(candidate);
      }
    }
    return picked;
  }

  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Cleanly appends a Co-Pilot text segment (with optional subheading) to existing chapter markdown.
 */
export function appendSegmentToChapter(
  existingContent: string,
  subheading: string,
  segmentBody: string
): string {
  const cleanBody = segmentBody.trim();
  if (!cleanBody) return existingContent;

  const cleanHeading = subheading.trim().replace(/^#+\s*/, '');
  const formattedBlock = cleanHeading
    ? `## ${cleanHeading}\n\n${cleanBody}`
    : cleanBody;

  const trimmedExisting = existingContent.trim();
  if (!trimmedExisting) {
    return formattedBlock;
  }

  return `${trimmedExisting}\n\n${formattedBlock}`;
}
