import type {
  BookProject,
  KdpAccountProfile,
  PillarDefinition,
  PillarId,
} from '../types/book';

export const COVER_ARTWORKS = [
  {
    id: 'art-geld',
    pillar: 'geld' as PillarId,
    label: 'Geld · Architektur',
    url: '/src/assets/images/cover_geld_1795166434681.jpg',
    defaultTextColor: 'dark' as const,
  },
  {
    id: 'art-beziehung',
    pillar: 'beziehung' as PillarId,
    label: 'Beziehung · Keramik',
    url: '/src/assets/images/cover_beziehung_1795166435836.jpg',
    defaultTextColor: 'dark' as const,
  },
  {
    id: 'art-glueck',
    pillar: 'glueck' as PillarId,
    label: 'Glück · Morgensee',
    url: '/src/assets/images/cover_glueck_1795166434367.jpg',
    defaultTextColor: 'dark' as const,
  },
  {
    id: 'art-gesundheit',
    pillar: 'gesundheit' as PillarId,
    label: 'Gesundheit · Botanik',
    url: '/src/assets/images/cover_gesundheit_1795166434470.jpg',
    defaultTextColor: 'dark' as const,
  },
  {
    id: 'art-none',
    pillar: 'geld' as PillarId,
    label: 'Reine Typografie',
    url: '',
    defaultTextColor: 'light' as const,
  },
];

export const PILLARS: Record<PillarId, PillarDefinition> = {
  geld: {
    id: 'geld',
    label: 'Geld',
    tagline: 'Wohlstand, finanzielle Souveränität & langfristige Sicherheit',
    coreDesire: 'Finanzielle Ruhe, planbares Wachstum und Unabhängigkeit von Geldsorgen.',
    readerPainPoints: [
      'Unübersichtliche Finanzen trotz solidem Einkommen',
      'Angst vor Altersarmut, Inflation und Fehlentscheidungen',
      'Komplexe Finanzsprache ohne alltagstaugliches System',
    ],
    recommendedCategories: [
      'Bücher > Business & Karriere > Geldanlage & Vermögensaufbau',
      'Bücher > Ratgeber > Recht, Beruf & Finanzen > Private Finanzen',
      'Kindle-Shop > Wirtschaft & Finanzen > Persönliche Finanzen',
    ],
    defaultArtworkUrl: '/src/assets/images/cover_geld_1795166434681.jpg',
    defaultAccentColor: '#1E3A8A',
  },
  beziehung: {
    id: 'beziehung',
    label: 'Beziehung',
    tagline: 'Partnerschaft, tiefe Verbundenheit & klare Kommunikation',
    coreDesire: 'Verstanden werden, tragfähige Nähe und respektvolle Grenzen im Alltag.',
    readerPainPoints: [
      'Wiederkehrende Konflikte und Missverständnisse im Alltag',
      'Emotionale Distanz trotz langer Partnerschaft',
      'Unsicherheit beim Setzen gesunder Grenzen',
    ],
    recommendedCategories: [
      'Bücher > Ratgeber > Lebenshilfe > Liebe & Partnerschaft',
      'Bücher > Psychologie > Kommunikation & Beziehungen',
      'Kindle-Shop > Ratgeber > Familie & Partnerschaft',
    ],
    defaultArtworkUrl: '/src/assets/images/cover_beziehung_1795166435836.jpg',
    defaultAccentColor: '#3730A3',
  },
  glueck: {
    id: 'glueck',
    label: 'Glück',
    tagline: 'Lebenssinn, innere Ruhe & tragfähige Zufriedenheit',
    coreDesire: 'Klarheit im Kopf, echte Lebensfreude und Gelassenheit im Wandel.',
    readerPainPoints: [
      'Dauerhafter Leistungsdruck ohne Gefühl von Ankommen',
      'Grübeln, Entscheidungsmüdigkeit und innere Unruhe',
      'Wunsch nach einem selbstbestimmten, stimmigen Lebensrhythmus',
    ],
    recommendedCategories: [
      'Bücher > Ratgeber > Lebenshilfe > Glück & Zufriedenheit',
      'Bücher > Psychologie > Achtsamkeit & Resilienz',
      'Kindle-Shop > Ratgeber > Persönlichkeitsentwicklung',
    ],
    defaultArtworkUrl: '/src/assets/images/cover_glueck_1795166434367.jpg',
    defaultAccentColor: '#0F4C81',
  },
  gesundheit: {
    id: 'gesundheit',
    label: 'Gesundheit',
    tagline: 'Vitalität, erholsamer Schlaf, Stressabbau & Langlebigkeit',
    coreDesire: 'Verlässliche körperliche Energie, Klarheit und gesunde Jahre bis ins Alter.',
    readerPainPoints: [
      'Chronische Erschöpfung und unruhiger Schlaf im Berufsalltag',
      'Überforderung durch widersprüchliche Ernährungs- und Fitnesstrends',
      'Fehlende Routinen, die ohne Perfektionismus durchhaltbar sind',
    ],
    recommendedCategories: [
      'Bücher > Ratgeber > Gesundheit & Medizin > Gesunde Lebensweise',
      'Bücher > Ratgeber > Ernährung & Schlaf',
      'Kindle-Shop > Gesundheit & Fitness > Stressbewältigung',
    ],
    defaultArtworkUrl: '/src/assets/images/cover_gesundheit_1795166434470.jpg',
    defaultAccentColor: '#166534',
  },
};

export const PILLAR_LIST: PillarDefinition[] = [
  PILLARS.geld,
  PILLARS.beziehung,
  PILLARS.glueck,
  PILLARS.gesundheit,
];

export const DEFAULT_KDP_ACCOUNT: KdpAccountProfile = {
  connected: true,
  accountLabel: 'KDP-Verlagsprofil (DACH)',
  primaryMarketplace: 'Amazon.de',
  authorLegalName: 'Martin Lindner',
  penName: 'Martin Lindner',
  imprintName: 'Edition Klartext',
  publisherAddress: 'Sendlinger Straße 42, 80331 München, Deutschland',
  taxProfileStatus: 'Hinterlegt (DE / USt-ID)',
  defaultRoyaltyBank: 'DE89 •••• •••• •••• 4102 (SEPA EUR)',
  lastSyncedAt: '2026-11-20',
};

export const SEED_BOOKS: BookProject[] = [
  {
    id: 'book-geld-souveraenitaet',
    pillar: 'geld',
    title: 'Stille Souveränität',
    subtitle: 'Wie ruhige Finanzsysteme über Jahrzehnte tragen – Vermögensaufbau ohne Lärm',
    author: 'Martin Lindner',
    targetAudience: 'Angestellte, Selbstständige und Familien (30–55 Jahre), die ohne Börsenstress nachhaltig Vermögen aufbauen wollen',
    corePromise: 'Ein klares 4-Konten- und ETF-System, das monatlich in 15 Minuten läuft und finanzielle Ruhe schafft.',
    tone: 'Ruhig, analytisch, konkret mit alltagsnahen Rechenbeispielen, ohne reißerische Gewinnversprechen',
    updatedAt: '2026-11-20',
    status: 'in-arbeit',
    formats: {
      kindleEbook: true,
      paperback: true,
      hardcover: false,
      audiobook: false,
    },
    chapters: [
      {
        id: 'ch-1',
        title: 'Warum finanzielle Ruhe wichtiger ist als die höchste Rendite',
        goal: 'Den Leser aus dem Vergleichs- und Renditestress abholen und das Grundprinzip robuster Systeme etablieren.',
        content: `Geld wird selten dort verloren, wo Menschen zu wenig wissen. Es wird fast immer dort verloren, wo ein System unter emotionalem Druck zusammenbricht. Wer jeden Morgen Börsennachrichten prüft, bezahlt eine unsichtbare Gebühr: Aufmerksamkeit, Schlaf und am Ende meist auch Rendite.

## Die Kosten lauter Finanzstrategien

In der Finanzbranche gilt Aufmerksamkeit als Währung. Neue Trends, kurzfristige Prognosen und vermeintliche Geheimtipps erzeugen das Gefühl, ständig handeln zu müssen. Doch empirische Auswertungen von Privatanleger-Depots über zwanzig Jahre zeigen ein ernüchterndes Muster: Je häufiger umgeschichtet wird, desto weiter fällt das Ergebnis hinter den breiten Markt zurück.

Ein stilles Finanzsystem dreht diese Logik um. Es trennt konsequent zwischen den Entscheidungen, die einmal pro Jahr durchdacht werden, und den Abläufen, die an den übrigen dreihundertvierundsechzig Tagen automatisch laufen.

## Drei Säulen stabiler Souveränität

- **Liquidität als Schutzschild**: Ein klar bezifferter Notgroschen auf einem separaten Tagesgeldkonto verhindert, dass langfristige Anlagen zur falschen Zeit verkauft werden müssen.
- **Automatisierte Sparquote**: Was am Monatsersten vor allen Konsumausgaben abfließt, muss nicht jeden Monat neu durch Willenskraft erkämpft werden.
- **Breite Streuung statt Wetten**: Weltweit gestreute, kostengünstige Indexfonds ersetzen Bauchgefühl durch jahrzehntelange Marktbreite.

Finanzielle Freiheit beginnt nicht erst mit der ersten Million auf dem Konto. Sie beginnt in dem Moment, in dem Ihre monatliche Struktur klar genug ist, damit Geld im Alltag wieder leise werden darf.`,
        annotations: [
          {
            id: 'ann-1',
            category: 'Beispiel / Fakten',
            quote: 'Je häufiger umgeschichtet wird, desto weiter fällt das Ergebnis hinter den breiten Markt zurück.',
            note: 'Bitte ein kurzes, greifbares Rechenbeispiel ergänzen (z. B. 300 € monatlich über 20 Jahre bei 6 % vs. 4 % nach Kosten/Timing-Fehlern), damit der Unterschied plastisch wird.',
            status: 'open',
            createdAt: '2026-11-20',
          },
          {
            id: 'ann-2',
            category: 'Stil & Ton',
            quote: 'an den übrigen dreihundertvierundsechzig Tagen',
            note: 'Zahl lieber als Ziffer schreiben ("364 Tagen") – liest sich im Sachbuch flüssiger.',
            status: 'open',
            createdAt: '2026-11-20',
          },
        ],
      },
      {
        id: 'ch-2',
        title: 'Die Architektur der vier Konten',
        goal: 'Eine sofort umsetzbare Kontenstruktur zeigen, die Fixkosten, Rücklagen, Alltag und Vermögensaufbau sauber trennt.',
        content: `Ein einziges Girokonto für alles ist wie ein Schreibtisch ohne Schubladen: Rechnungen, Urlaubspläne und langfristige Rücklagen liegen auf demselben Stapel. Am Monatsende entsteht das trügerische Gefühl, entweder zu viel oder zu wenig Spielraum zu haben.

## Klarheit durch physische Trennung

Wenn jeder Euro eine feste Aufgabe bekommt, verschwindet das schlechte Gewissen beim Ausgeben ebenso wie die Sorge vor unerwarteten Abbuchungen. Die Vier-Konten-Architektur lässt sich an einem einzigen Nachmittag einrichten:

- **Konto 1 – Fixkosten & Wohnen**: Hier gehen Gehalt und alle wiederkehrenden Verpflichtungen ein (Miete, Strom, Versicherungen, Mobilfunk).
- **Konto 2 – Sicherheitsrücklage**: Ein Tagesgeldkonto für drei bis sechs Monatsausgaben. Dieses Konto ist tabu für Urlaub oder spontane Anschaffungen.
- **Konto 3 – Alltag & bewusster Genuss**: Ein klar begrenztes Monatsbudget für Lebensmittel, Freizeit und Restaurantbesuche. Ist das Budget frei verfügbar, darf es ohne Reue genutzt werden.
- **Konto 4 – Langfristiges Depot**: Automatischer Sparplan am zweiten Bankarbeitstag des Monats, bevor der Alltag das Konto berührt.

## Praxis-Check für Ihren Start

Notieren Sie heute Ihre tatsächlichen Fixkosten der letzten zwölf Monate – inklusive jährlicher Abbuchungen wie Kfz-Versicherung oder Rundfunkbeitrag – und teilen Sie die Jahressumme durch zwölf. Genau dieser Betrag plus zehn Prozent Puffer bleibt auf Konto 1.`,
        annotations: [],
      },
      {
        id: 'ch-3',
        title: 'Zinseszins verstehen und steuerlich sauber strukturieren',
        goal: 'Die Mechanik von Kostenquote, Sparerpauschbetrag und Rebalancing verständlich erklären.',
        content: `Der Zinseszins entfaltet seine wahre Kraft erst im zweiten Jahrzehnt. Viele Anleger überschätzen, was in zwei Jahren möglich ist, und unterschätzen dramatisch, was in fünfzehn Jahren ruhiger Konsequenz entsteht.

## Warum Gebühren doppelt wiegen

Ein Prozentpunkt jährlicher Verwaltungsgebühr wirkt auf dem Papier harmlos. Über fünfundzwanzig Jahre frisst genau dieser eine Prozentpunkt jedoch mehr als ein Fünftel Ihres gesamten Endvermögens auf, weil nicht nur die Gebühr selbst fehlt, sondern auch jeder künftige Ertrag darauf.

## Der jährliche 20-Minuten-Termin

Einmal im Jahr – idealerweise an einem ruhigen Wochenende im Januar – prüfen Sie drei Punkte: Ist der Freistellungsauftrag optimal ausgeschöpft? Entspricht das Verhältnis zwischen sicherem Tagesgeld und Aktien-ETF noch Ihrer persönlichen Risikotragfähigkeit? Und lässt sich die Sparrate nach einer Gehaltsentwicklung um zwanzig oder fünfzig Euro anheben? Mehr Aktivität braucht ein tragfähiges Vermögenssystem nicht.`,
        annotations: [],
      },
      {
        id: 'ch-4',
        title: 'Psychologie in Krisen: Wenn die Kurse zwanzig Prozent fallen',
        goal: 'Einen verbindlichen Notfallplan für Börsenkorrekturen formulieren, damit das System auch im Gegenwind hält.',
        content: `Jede Anlagestrategie sieht in steigenden Märkten klug aus. Ob ein Finanzplan wirklich zu Ihnen passt, entscheidet sich erst in den Wochen, in denen Schlagzeilen von historischen Einbrüchen sprechen und Ihr Depot im Minus steht.

## Das schriftliche Investment-Versprechen

Schreiben Sie in einer ruhigen Marktphase eine halbe Seite an Ihr zukünftiges Ich. Halten Sie darin fest, warum Sie investieren, für welchen Zeithorizont das Geld bestimmt ist und dass ein Rückgang von dreißig Prozent kein Systemfehler, sondern der reguläre Eintrittspreis für langfristige Renditen ist.

Legen Sie diesen Brief nicht in eine verborgene Datei, sondern in Ihren Finanzordner. Wer seine Regeln vor dem Sturm festlegt, muss im Sturm nicht mehr verhandeln.`,
        annotations: [],
      },
    ],
    cover: {
      artworkId: 'art-geld',
      layout: 'editorial',
      eyebrow: 'Finanzielle Klarheit für den Alltag',
      titleFont: 'serif',
      textColor: 'dark',
      accentColor: '#1E3A8A',
      scrimOpacity: 12,
      backCoverBlurb:
        'Finanzielle Freiheit beginnt nicht mit der Jagd nach dem nächsten Trend, sondern mit einem System, das im Hintergrund zuverlässig arbeitet. Martin Lindner zeigt Schritt für Schritt, wie Sie in wenigen Stunden eine klare Vier-Konten-Struktur und ein wartungsarmes ETF-Fundament aufbauen – ohne Fachjargon, ohne täglichen Börsenstress.',
      spineText: 'Stille Souveränität · Martin Lindner',
      finish: 'matt',
      artDirectionNote:
        'Helle architektonische Ruhe im oberen Drittel maximiert die Kontrast-Lesbarkeit des serifenbetonten Titels bereits in kleinen Amazon-Suchergebnis-Thumbnails.',
      imagePrompt:
        'Minimalist architectural marble colonnade in morning light, subtle brushed brass lines, clean negative space at top for book typography, editorial luxury aesthetic, no text',
    },
    format: {
      trimSize: '6x9',
      paperType: 'cream',
      fontFamily: 'Garamond',
      fontSizePt: 11,
      lineHeight: 1.45,
      includeTitlePage: true,
      includeImprint: true,
      includeToc: true,
      startChaptersOnRight: true,
      runningHeaders: true,
      pageNumbers: true,
      firstLineIndent: true,
      bleed: false,
    },
    kdp: {
      language: 'Deutsch',
      seriesName: 'Edition Klartext Finanzen',
      seriesNumber: '1',
      editionNumber: '1',
      descriptionHtml: `<h4>Schluss mit Finanzstress: Wie ein ruhiges System Ihr Vermögen über Jahrzehnte trägt</h4>
<p>Sie verdienen solide, legen gelegentlich etwas zurück – und haben trotzdem das Gefühl, dass Ihre Finanzen mehr Unruhe als Sicherheit erzeugen? Die meisten Ratgeber überfordern mit Fachbegriffen oder versprechen unrealistische Abkürzungen.</p>
<p><b>Stille Souveränität</b> zeigt einen erwachsenen, praxiserprobten Gegenentwurf: ein klares Finanzsystem, das einmal sauber aufgesetzt wird und danach in 15 Minuten pro Monat zuverlässig für Sie arbeitet.</p>
<ul>
<li><b>Die 4-Konten-Architektur:</b> Fixkosten, Sicherheitsrücklage, bewusster Alltag und Vermögensaufbau sauber trennen.</li>
<li><b>Wartungsarmes ETF-Fundament:</b> Warum niedrige Kosten und weltweite Streuung fast jede aktive Strategie schlagen.</li>
<li><b>Krisenfest bleiben:</b> Ihr persönliches Regelwerk für fallende Kurse – ohne Panikverkäufe.</li>
<li><b>Direkt umsetzbar:</b> Mit klaren Checklisten und Rechenbeispielen für den deutschsprachigen Raum.</li>
</ul>
<p><i>Für Berufstätige, Selbstständige und Familien, die Geld wieder leise machen und langfristig ruhig schlafen möchten.</i></p>`,
      keywords: [
        'etf sparplan einsteiger anleitung deutsch',
        'vermögensaufbau ohne stress altersvorsorge',
        'vier konten modell haushaltsbudget system',
        'passiv investieren geldanlage buch praxis',
        'finanzielle freiheit privatfinanzen ordnen',
        'geld anlegen berufstätige familie sicherheit',
        'zinseszins depot aufbauen fehler vermeiden',
      ],
      categories: [
        'Bücher > Business & Karriere > Geldanlage & Vermögensaufbau',
        'Bücher > Ratgeber > Recht, Beruf & Finanzen > Private Finanzen',
        'Kindle-Shop > Wirtschaft & Finanzen > Persönliche Finanzen',
      ],
      readingAgeMin: '18',
      readingAgeMax: '18+',
      adultContent: false,
      aiGeneratedDisclosure: 'ai-assisted',
      ebookPriceEur: 7.99,
      paperbackPriceEur: 14.9,
      royaltyPlanEbook: '70',
      kdpSelectEnrolled: true,
      isbnMode: 'kdp-free',
      ownIsbn: '',
      subtitleSuggestions: [
        'Das ruhige 4-Konten- und ETF-System für nachhaltigen Vermögensaufbau im Alltag',
        'Privatfinanzen ordnen, sicher investieren und ohne Börsenstress Vermögen aufbauen',
        'Warum stille Finanzsysteme über Jahrzehnte tragen – Der Praxis-Leitfaden für den DACH-Raum',
      ],
    },
  },
  {
    id: 'book-gesundheit-schlaf',
    pillar: 'gesundheit',
    title: 'Tiefer Schlaf, klarer Kopf',
    subtitle: 'Das 14-Abende-Protokoll für erholsame Nächte und ruhige Energie am Tag',
    author: 'Martin Lindner',
    targetAudience: 'Berufstätige und Eltern (30–60 Jahre) mit unruhigen Nächten, Grübeln am Abend und Tagesmüdigkeit',
    corePromise: 'Ohne Schlafmittel oder starre Verbote in 14 Abenden den eigenen Biorhythmus stabilisieren und spürbar erholter aufwachen.',
    tone: 'Wissenschaftlich fundiert, warmherzig, direkt im Alltag umsetzbar',
    updatedAt: '2026-11-14',
    status: 'eingereicht',
    submittedAt: '2026-11-14',
    submittedNote: '1. Auflage über Amazon KDP (DE) eingereicht – inkl. ACX-Hörbuch-Freigabe.',
    formats: {
      kindleEbook: true,
      paperback: true,
      hardcover: false,
      audiobook: true,
    },
    chapters: [
      {
        id: 'ch-s-1',
        title: 'Warum Schlaf kein Luxus, sondern Ihr biologisches Fundament ist',
        goal: 'Verständnis für Schlafarchitektur und nächtliche Regeneration wecken.',
        content: `Wer dauerhaft zu wenig oder zu oberflächlich schläft, verliert nicht nur Energie am Morgen. Schon nach drei Nächten mit verkürzter Tiefschlafphase sinkt die emotionale Belastbarkeit, die Entscheidungsqualität lässt nach und der Körper reagiert messbar empfindlicher auf Alltagsstress.

## Was im Tiefschlaf wirklich geschieht

Zwischen der ersten und vierten Stunde nach dem Einschlafen leistet Ihr Gehirn stille Schwerstarbeit: Stoffwechselreste werden abtransportiert, das Immunsystem kalibriert sich neu und Gedächtnisinhalte werden geordnet. Diese Phase lässt sich durch Kaffee am nächsten Morgen nicht ersetzen.

## Die Befreiung vom Leistungsdruck im Bett

Guter Schlaf entsteht niemals durch Anstrengung. Niemand kann sich zwingen einzuschlafen – doch jeder kann die Bedingungen so gestalten, dass der Körper am Abend wie von selbst in den Ruhemodus wechselt.`,
        annotations: [],
      },
      {
        id: 'ch-s-2',
        title: 'Licht, Temperatur und der innere Taktgeber',
        goal: 'Die drei stärksten biologischen Zeitgeber praxisnah für den Alltag nutzbar machen.',
        content: `Unsere innere Uhr richtet sich nicht nach dem Wecker, sondern nach Lichtspektrum und Körperkerntemperatur. Zehn Minuten natürliches Tageslicht in der ersten Stunde nach dem Aufwachen setzen den hormonellen Timer, der sechzehn Stunden später die Melatonin-Ausschüttung anstößt.

## Die Abend-Absenkung

Ab zwei Stunden vor der gewünschten Schlafenszeit helfen warmes, gedimmtes Licht und eine leicht abgesenkte Raumtemperatur im Schlafzimmer zwischen sechzehn und achtzehn Grad. Eine kurze warme Dusche weitet die Gefäße an Händen und Füßen, wodurch der Körperkern schneller abkühlt – ein direktes biologisches Signal für das Einschlafen.`,
        annotations: [],
      },
      {
        id: 'ch-s-3',
        title: 'Gedankenkarussell stoppen: Das 5-Minuten-Abendprotokoll',
        goal: 'Grübeln im Bett durch einen klaren gedanklichen Abschluss vor dem Zubettgehen beenden.',
        content: `Viele Menschen sind körperlich erschöpft und dennoch hellwach, sobald das Licht ausgeht. Der Grund ist selten eine echte Schlafstörung, sondern ein unerledigter Arbeitsspeicher im Kopf: offene Aufgaben, Gespräche und Sorgen melden sich genau dann, wenn außen endlich Ruhe herrscht.

## Das Papier neben dem Schreibtisch

Notieren Sie zwei Stunden vor dem Schlafen in genau fünf Minuten drei offene Punkte für den nächsten Tag sowie jeweils den ersten konkreten Schritt. Schließen Sie das Notizbuch bewusst. Ihr Gehirn erkennt das Signal, dass nichts über Nacht festgehalten werden muss.`,
        annotations: [],
      },
      {
        id: 'ch-s-4',
        title: 'Der 14-Abende-Fahrplan für dauerhafte Schlafruhe',
        goal: 'Alle Hebel in einen realistischen Zwei-Wochen-Plan ohne Perfektionismus zusammenführen.',
        content: `Veränderung scheitert selten am Wissen, sondern an zu vielen gleichzeitigen Regeln. In der ersten Woche stabilisieren Sie lediglich zwei Anker: eine feste Aufstehzeit und zehn Minuten Morgenlicht. Erst in der zweiten Woche ergänzen Sie das fünfminütige Abendprotokoll und die lichtarme Stunde vor dem Zubettgehen.

Nach vierzehn Tagen spüren die meisten Leser keinen dramatischen Umbruch, sondern etwas viel Wertvolleres: ruhigere Nächte, weniger nächtliches Wachliegen und eine verlässliche Klarheit ab der ersten Stunde des Tages.`,
        annotations: [],
      },
    ],
    cover: {
      artworkId: 'art-gesundheit',
      layout: 'editorial',
      eyebrow: 'Regeneration & Biorhythmus',
      titleFont: 'serif',
      textColor: 'dark',
      accentColor: '#166534',
      scrimOpacity: 14,
      backCoverBlurb:
        'Erholsamer Schlaf lässt sich nicht erzwingen – aber gezielt ermöglichen. Martin Lindner verbindet aktuelle Schlafforschung mit einem ruhigen 14-Abende-Protokoll für Menschen mit vollem Alltag.',
      spineText: 'Tiefer Schlaf, klarer Kopf · Martin Lindner',
      finish: 'matt',
      kindleVariant: {
        artworkId: 'art-none',
        useGeneratedArtwork: true,
        motifStyle: 'botanical',
        palettePrimary: '#0E241C',
        paletteSecondary: '#166534',
        layout: 'band',
        eyebrow: 'Kindle Edition · Gesundheit',
        titleFont: 'sans',
        textColor: 'light',
        accentColor: '#166534',
        scrimOpacity: 24,
      },
    },
    format: {
      trimSize: '5.5x8.5',
      paperType: 'cream',
      fontFamily: 'Garamond',
      fontSizePt: 11,
      lineHeight: 1.45,
      includeTitlePage: true,
      includeImprint: true,
      includeToc: true,
      startChaptersOnRight: true,
      runningHeaders: true,
      pageNumbers: true,
      firstLineIndent: true,
      bleed: false,
    },
    kdp: {
      language: 'Deutsch',
      seriesName: 'Edition Klartext Gesundheit',
      seriesNumber: '1',
      editionNumber: '1',
      descriptionHtml: `<h4>Endlich wieder durchschlafen – ohne starre Verbote</h4>
<p><b>Tiefer Schlaf, klarer Kopf</b> bietet ein alltagstaugliches 14-Abende-Protokoll, das Ihren natürlichen Biorhythmus sanft neu ausrichtet und das abendliche Gedankenkarussell beruhigt.</p>
<ul>
<li><b>Biologische Zeitgeber nutzen:</b> Morgenlicht, Raumklima und Abendrhythmus ohne Aufwand abstimmen.</li>
<li><b>5-Minuten-Abendprotokoll:</b> Offene Gedanken sicher vor der Schlafzimmertür ablegen.</li>
<li><b>14-Abende-Fahrplan:</b> Schrittweise Routinen für dauerhaft erholte Morgen.</li>
</ul>`,
      keywords: [
        'besser schlafen ratgeber einschlafen tipps',
        'schlafstörungen natürlich lösen biorhythmus',
        'gedankenkarussell abends stoppen ruhe',
        'tiefschlaf verbessern erholung alltag',
        'gesunder schlaf berufstätige stressabbau',
        'abendroutine schlafqualität steigern buch',
        'durchschlafen ohne schlafmittel anleitung',
      ],
      categories: [
        'Bücher > Ratgeber > Gesundheit & Medizin > Gesunde Lebensweise',
        'Bücher > Ratgeber > Ernährung & Schlaf',
        'Kindle-Shop > Gesundheit & Fitness > Stressbewältigung',
      ],
      readingAgeMin: '18',
      readingAgeMax: '18+',
      adultContent: false,
      aiGeneratedDisclosure: 'ai-assisted',
      ebookPriceEur: 6.99,
      paperbackPriceEur: 13.9,
      royaltyPlanEbook: '70',
      kdpSelectEnrolled: true,
      isbnMode: 'kdp-free',
      ownIsbn: '',
    },
  },
];

export function createNewBookProject(params: {
  pillar: PillarId;
  title: string;
  subtitle: string;
  author: string;
  targetAudience: string;
  corePromise: string;
  sampleChapters?: string[];
}): BookProject {
  const pillarDef = PILLARS[params.pillar];
  const artwork = COVER_ARTWORKS.find((a) => a.pillar === params.pillar) || COVER_ARTWORKS[0];
  const now = new Date().toISOString().slice(0, 10);
  const promiseText = params.corePromise.trim() || pillarDef.coreDesire;

  const initialChapters =
    params.sampleChapters && params.sampleChapters.length > 0
      ? params.sampleChapters.map((chTitle, idx) => ({
          id: `ch-${Date.now()}-${idx + 1}`,
          title: chTitle,
          goal:
            idx === 0
              ? `Leser beim Kernthema ${pillarDef.label} abholen und das Versprechen einleiten.`
              : `Zahlt direkt auf das Core Promise ein: ${promiseText}`,
          content:
            idx === 0
              ? `Dieses Buch widmet sich dem zeitlosen Grundbedürfnis ${pillarDef.label}. ${promiseText}\n\n## Einstieg\n\nNutzen Sie den Schreib-Co-Piloten rechts oder „Kapitel mit KI entwerfen“, um diesen Abschnitt entlang Ihres Core Promise auszubauen.`
              : '',
          annotations: [],
        }))
      : [
          {
            id: `ch-${Date.now()}-1`,
            title: `Einleitung: Warum ${pillarDef.label} heute neu gedacht werden muss`,
            goal: 'Leser beim akuten Schmerzpunkt abholen und das zentrale Versprechen des Buches klar formulieren.',
            content: `Dieses Buch widmet sich einem der vier zeitlosen Grundbedürfnisse des Menschen: ${pillarDef.label}. ${promiseText}\n\n## Was Sie auf den kommenden Seiten erwartet\n\nNutzen Sie den Schreib-Co-Piloten oder „Kapitel mit KI entwerfen“, um dieses Kapitel entlang Ihres Buchkonzepts vollständig auszuarbeiten.`,
            annotations: [],
          },
          {
            id: `ch-${Date.now()}-2`,
            title: 'Die häufigsten Denkfehler – und was stattdessen wirkt',
            goal: 'Verbreitete Mythen entkräften und eine klare Struktur für nachhaltige Veränderung legen.',
            content: '',
            annotations: [],
          },
          {
            id: `ch-${Date.now()}-3`,
            title: 'Ihr konkretes Praxissystem für den Alltag',
            goal: 'Schritt-für-Schritt-Anleitung mit direkt anwendbaren Übungen.',
            content: '',
            annotations: [],
          },
        ];

  return {
    id: `book-${Date.now()}`,
    pillar: params.pillar,
    title: params.title.trim(),
    subtitle: params.subtitle.trim(),
    author: params.author.trim(),
    targetAudience: params.targetAudience.trim() || 'Deutschsprachige Sachbuchleser (28–55 Jahre)',
    corePromise: promiseText,
    tone: 'Klar, warm, praxisnah und evidenzbasiert ohne Werbefloskeln',
    updatedAt: now,
    status: 'in-arbeit',
    formats: {
      kindleEbook: true,
      paperback: true,
      hardcover: false,
      audiobook: false,
    },
    chapters: initialChapters,
    cover: {
      artworkId: artwork.id,
      layout: 'editorial',
      eyebrow: `Schwerpunkt ${pillarDef.label}`,
      titleFont: 'serif',
      textColor: 'dark',
      accentColor: pillarDef.defaultAccentColor,
      scrimOpacity: 12,
      backCoverBlurb: `${params.title.trim()}: ${params.corePromise.trim() || pillarDef.coreDesire}`,
      spineText: `${params.title.trim()} · ${params.author.trim()}`,
      finish: 'matt',
    },
    format: {
      trimSize: '6x9',
      paperType: 'cream',
      fontFamily: 'Garamond',
      fontSizePt: 11,
      lineHeight: 1.45,
      includeTitlePage: true,
      includeImprint: true,
      includeToc: true,
      startChaptersOnRight: true,
      runningHeaders: true,
      pageNumbers: true,
      firstLineIndent: true,
      bleed: false,
    },
    kdp: {
      language: 'Deutsch',
      seriesName: '',
      seriesNumber: '',
      editionNumber: '1',
      descriptionHtml: `<h4>${params.title.trim()}</h4>\n<p>${params.corePromise.trim() || pillarDef.coreDesire}</p>`,
      keywords: ['', '', '', '', '', '', ''],
      categories: [...pillarDef.recommendedCategories] as [string, string, string],
      readingAgeMin: '18',
      readingAgeMax: '18+',
      adultContent: false,
      aiGeneratedDisclosure: 'ai-assisted',
      ebookPriceEur: 6.99,
      paperbackPriceEur: 14.9,
      royaltyPlanEbook: '70',
      kdpSelectEnrolled: true,
      isbnMode: 'kdp-free',
      ownIsbn: '',
    },
  };
}
