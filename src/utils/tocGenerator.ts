import type { BookProject, Chapter, PillarId } from '../types/book';
import { PILLARS } from '../data/seedBooks';
import { extractKeyTerms } from './chapterPerformance';

export type TocStructureStyle = 'praxis-leitfaden' | 'protokoll' | 'problem-system';

export interface TocChapterProposal {
  id: string;
  partLabel: string;
  chapterNumber: number;
  title: string;
  goal: string;
  promiseLink: string;
  sections: string[];
  estimatedWords: number;
  included: boolean;
}

export interface TocProposalResult {
  structureStyle: TocStructureStyle;
  corePromiseUsed: string;
  extractedConcepts: string[];
  totalEstimatedWords: number;
  chapters: TocChapterProposal[];
  source: 'auto' | 'ai';
}

export const TOC_STRUCTURE_STYLES: Array<{
  id: TocStructureStyle;
  label: string;
  description: string;
}> = [
  {
    id: 'praxis-leitfaden',
    label: 'Praxis-Leitfaden',
    description: 'Klassische Sachbuch-Dramaturgie: Fundament → Kernmethode → Umsetzung & Alltag',
  },
  {
    id: 'protokoll',
    label: 'Schritt-für-Schritt-Protokoll',
    description: 'Umsetzungsstarker Fahrplan mit aufeinander aufbauenden Etappen und Checklisten',
  },
  {
    id: 'problem-system',
    label: 'Problem → System → Meisterschaft',
    description: 'Scharfe Diagnose der Denkfehler, gefolgt vom ruhigen Gesamtsystem und Krisenfestigkeit',
  },
];

interface PillarContextHints {
  painPoint: string;
  mythTitle: string;
  obstacleTitle: string;
  routineLabel: string;
  metricLabel: string;
}

const PILLAR_HINTS: Record<PillarId, PillarContextHints> = {
  geld: {
    painPoint: 'Finanzstress, Renditejagd und unklare Geldflüsse',
    mythTitle: 'Warum mehr Aktivität selten zu mehr Vermögen führt',
    obstacleTitle: 'Krisenfest bleiben: Wenn Märkte schwanken oder Unerwartetes eintritt',
    routineLabel: 'Monatliche Finanz-Routine',
    metricLabel: 'Sparquote, Sicherheitsrücklage & Kostenquote',
  },
  beziehung: {
    painPoint: 'wiederkehrende Missverständnisse und emotionale Distanz',
    mythTitle: 'Warum gute Absichten allein noch keine tragfähige Nähe schaffen',
    obstacleTitle: 'Wenn alte Muster zurückkehren: Konflikte ruhig und klar klären',
    routineLabel: 'Wöchentliche Gesprächs- & Verbindungspraxis',
    metricLabel: 'Klarheit, Grenzen & gelebte Wertschätzung',
  },
  glueck: {
    painPoint: 'innerer Leistungsdruck, Grübeln und fehlender Fokus',
    mythTitle: 'Warum ständige Optimierung oft weiter von echter Zufriedenheit entfernt',
    obstacleTitle: 'Gelassen bleiben, wenn der Alltag laut und fordernd wird',
    routineLabel: 'Tägliche Klarheits- & Fokus-Routine',
    metricLabel: 'Energie, Stimmigkeit & bewusste Entscheidungen',
  },
  gesundheit: {
    painPoint: 'Erschöpfung, widersprüchliche Trends und kurzlebige Disziplin',
    mythTitle: 'Warum Perfektionismus der größte Gegner dauerhafter Vitalität ist',
    obstacleTitle: 'Dranbleiben bei Stress, Reisen und vollen Arbeitswochen',
    routineLabel: 'Alltagstaugliche Regenerations-Routine',
    metricLabel: 'Schlafqualität, Tagesenergie & Belastbarkeit',
  },
};

const TIME_UNIT_NOUNS = new Set([
  'minuten', 'minute', 'stunden', 'stunde', 'tagen', 'tage', 'tag',
  'wochen', 'woche', 'abenden', 'abende', 'abend', 'monaten', 'monate',
  'monat', 'jahren', 'jahre', 'jahr', 'schritten', 'schritte',
]);

/**
 * Extracts concrete noun concepts and time/number anchors (like "4-Konten", "ETF-System", "Ruhe", "15 Minuten")
 * from the book's Core Promise so the generated TOC reflects the exact book promise with clean German grammar.
 */
export function extractCorePromiseConcepts(book: BookProject): {
  corePromiseText: string;
  concepts: string[];
  timeAnchor: string | null;
} {
  const pillarDef = PILLARS[book.pillar];
  const corePromiseText = book.corePromise.trim() || pillarDef.coreDesire;

  // Capture concrete numeric timeframes or systems such as "15 Minuten", "14 Abenden", "30 Tagen"
  const timeMatch = corePromiseText.match(
    /\b(\d+\s+(?:Minuten|Stunden|Tagen|Tage|Wochen|Abenden|Abende|Schritten|Schritte|Monaten|Monate))\b/i
  );
  const timeAnchor = timeMatch ? timeMatch[1] : null;

  const keyTerms = extractKeyTerms(corePromiseText).map((t) => t.display);
  // Prefer substantive German nouns/compounds (starting with uppercase or digit-compound) and exclude pure time units
  const nounConcepts = keyTerms.filter(
    (term) =>
      (/^[A-ZÄÖÜ]/.test(term) || /^\d+-[A-ZÄÖÜa-zäöü]/.test(term)) &&
      !TIME_UNIT_NOUNS.has(term.toLowerCase())
  );

  const concepts = (nounConcepts.length > 0 ? nounConcepts : keyTerms).slice(0, 6);

  return {
    corePromiseText,
    concepts,
    timeAnchor,
  };
}

function buildBlueprintSlots(
  book: BookProject,
  style: TocStructureStyle,
  corePromiseText: string,
  concepts: string[],
  timeAnchor: string | null
): Array<Omit<TocChapterProposal, 'id' | 'chapterNumber' | 'included'>> {
  const pillarDef = PILLARS[book.pillar];
  const hints = PILLAR_HINTS[book.pillar];

  const primaryConcept = concepts[0] || pillarDef.label;
  const secondaryConcept = concepts[1] || hints.routineLabel;
  const tertiaryConcept = concepts[2] || pillarDef.tagline.split('&')[0].trim();
  const outcomeConcept =
    concepts.length >= 3
      ? concepts[concepts.length - 1]
      : concepts.length === 2
        ? concepts[1]
        : pillarDef.label;
  const cadenceText = timeAnchor ? `in ${timeAnchor}` : 'im vollen Alltag';
  const audienceShort = book.targetAudience.trim()
    ? book.targetAudience.split(',')[0].trim()
    : 'Ihre Zielgruppe';

  if (style === 'protokoll') {
    return [
      {
        partLabel: 'Teil I · Bestandsaufnahme & Startpunkt',
        title: `Standortbestimmung: Wo Sie bei ${primaryConcept} heute stehen`,
        goal: `Den Leser bei ${hints.painPoint} abholen und eine ehrliche Ausgangsbasis für das Protokoll schaffen.`,
        promiseLink: `Definiert den klaren Ausgangspunkt für das Versprechen: „${corePromiseText}“`,
        sections: [
          `Die unsichtbaren Ursachen hinter ${hints.painPoint}`,
          'Selbst-Check: Ihre aktuelle Ausgangslage in 5 Minuten',
          `Wie dieses Buch ${cadenceText} spürbare Ergebnisse ermöglicht`,
        ],
        estimatedWords: 1600,
      },
      {
        partLabel: 'Teil I · Bestandsaufnahme & Startpunkt',
        title: hints.mythTitle,
        goal: 'Typische Irrtümer entkräften, damit das neue Protokoll ohne innere Widerstände greifen kann.',
        promiseLink: `Räumt Fehlannahmen aus dem Weg, die ${primaryConcept} und ${secondaryConcept} bisher blockiert haben.`,
        sections: [
          'Drei verbreitete Denkfehler, die unnötig Kraft kosten',
          `Der Perspektivwechsel hin zu mehr ${outcomeConcept}`,
          'Entscheidungsregeln für mehr Einfachheit statt Komplexität',
        ],
        estimatedWords: 1700,
      },
      {
        partLabel: 'Teil II · Das Kern-Protokoll Schritt für Schritt',
        title: `Phase 1: Das Fundament rund um ${primaryConcept} einrichten`,
        goal: `Die tragende Grundstruktur für ${primaryConcept} sauber, einmalig und fehlerarm aufsetzen.`,
        promiseLink: `Setzt den ersten Kernbaustein (${primaryConcept}) aus dem Core Promise unmittelbar praktisch um.`,
        sections: [
          `Aufbau und Architektur von ${primaryConcept}`,
          'Konkrete Schritt-für-Schritt-Einrichtung',
          'Typische Startfehler direkt vermeiden',
        ],
        estimatedWords: 2200,
      },
      {
        partLabel: 'Teil II · Das Kern-Protokoll Schritt für Schritt',
        title: `Phase 2: ${secondaryConcept} alltagstauglich verankern`,
        goal: `Das Zusammenspiel zwischen ${primaryConcept} und ${secondaryConcept} in einen stabilen Ablauf bringen.`,
        promiseLink: `Verbindet ${secondaryConcept} mit klaren Leitplanken für ${audienceShort}.`,
        sections: [
          `Wie ${secondaryConcept} zuverlässig im Hintergrund arbeitet`,
          'Praxisbeispiel aus dem echten Alltag mit klaren Zahlen/Abläufen',
          'Die kompakte Umsetzungs-Checkliste für Phase 2',
        ],
        estimatedWords: 2200,
      },
      {
        partLabel: 'Teil II · Das Kern-Protokoll Schritt für Schritt',
        title: `Phase 3: Der feste Rhythmus ${cadenceText}`,
        goal: `Die regelmäßige Routine etablieren, die ${tertiaryConcept} ohne Willenskraft-Verschleiß trägt.`,
        promiseLink: `Macht den Zeit- und Umsetzungsanspruch (${cadenceText}) aus dem Core Promise konkret erlebbar.`,
        sections: [
          `Ihr minimaler Ablauf ${cadenceText}`,
          `Woran Sie Fortschritt messen (${hints.metricLabel})`,
          'Werkzeuge, Vorlagen und Erinnerungsanker',
        ],
        estimatedWords: 2000,
      },
      {
        partLabel: 'Teil III · Feinschliff, Hürden & Langfristigkeit',
        title: hints.obstacleTitle,
        goal: 'Einen verbindlichen Notfall- und Gegenwind-Plan liefern, damit der Leser nicht in alte Muster kippt.',
        promiseLink: `Sichert ab, dass das Core Promise auch in schwierigen Phasen verlässlich hält.`,
        sections: [
          'Die häufigsten Stolpersteine nach den ersten Wochen',
          'Wenn-Dann-Regeln für stressige Ausnahmezeiten',
          'Zurück in die Spur ohne Schuldgefühle oder Perfektionismus',
        ],
        estimatedWords: 1800,
      },
      {
        partLabel: 'Teil III · Feinschliff, Hürden & Langfristigkeit',
        title: `Vertiefung: ${tertiaryConcept} gezielt weiterentwickeln`,
        goal: 'Fortgeschrittene Stellschrauben zeigen, sobald die Basis ruhig läuft.',
        promiseLink: `Hebt das erreichte Fundament auf das nächste Niveau in Richtung ${outcomeConcept}.`,
        sections: [
          'Wann sich Nachjustieren lohnt – und wann Ruhe besser ist',
          `Praxisfälle für unterschiedliche Lebensphasen (${audienceShort})`,
          'Langfristige Anpassung bei veränderten Zielen',
        ],
        estimatedWords: 1700,
      },
      {
        partLabel: 'Teil III · Feinschliff, Hürden & Langfristigkeit',
        title: `Ihr Umsetzungsplan: Mit System zu mehr ${outcomeConcept}`,
        goal: 'Alle Schritte in einen übersichtlichen Startfahrplan für die nächsten Wochen verdichten.',
        promiseLink: `Führt sämtliche Bausteine zusammen und löst das Core Promise verbindlich ein.`,
        sections: [
          'Ihr kompakter 30-Tage-Startplan auf einen Blick',
          'Die wichtigsten 5 Regeln zum Nachschlagen',
          'Ausblick: Wie sich Ihr Alltag durch das neue System verändert',
        ],
        estimatedWords: 1600,
      },
      {
        partLabel: 'Teil II · Das Kern-Protokoll Schritt für Schritt',
        title: `Praxis-Werkstatt: Konkrete Fallbeispiele zu ${primaryConcept}`,
        goal: 'Anhand realitätsnaher Szenarien zeigen, wie das System bei verschiedenen Ausgangslagen greift.',
        promiseLink: `Übersetzt das Core Promise in greifbare Vorher-Nachher-Beispiele für ${audienceShort}.`,
        sections: [
          'Fallbeispiel 1: Einstieg mit wenig Zeit im Berufsalltag',
          'Fallbeispiel 2: Neustart nach bisherigen Rückschlägen',
          'Was sich direkt auf Ihre eigene Situation übertragen lässt',
        ],
        estimatedWords: 1900,
      },
      {
        partLabel: 'Teil III · Feinschliff, Hürden & Langfristigkeit',
        title: 'Jahres-Review & Checklisten-Anhang',
        goal: 'Einen schlanken jährlichen Prüfprozess und druckbare Arbeitsblätter bereitstellen.',
        promiseLink: `Garantiert nachhaltige Stabilität für „${book.title}“ über Jahre hinweg.`,
        sections: [
          'Das jährliche 20-Minuten-Review',
          'Übersicht aller Checklisten und Vorlagen',
          'Persönliche Ziel- und Fortschrittsnotizen',
        ],
        estimatedWords: 1400,
      },
    ];
  }

  if (style === 'problem-system') {
    return [
      {
        partLabel: 'Teil I · Klare Diagnose',
        title: `Das eigentliche Problem hinter ${hints.painPoint.split(',')[0]}`,
        goal: 'Zeigen, warum isolierte Tipps scheitern und erst ein ruhiges Gesamtsystem nachhaltige Lösung bringt.',
        promiseLink: `Öffnet den Spannungsbogen direkt auf das Core Promise: „${corePromiseText}“`,
        sections: [
          'Warum reine Willenskraft im Alltag verlässlich ermüdet',
          `Was ${audienceShort} tatsächlich zurückhält`,
          `Der Maßstab dieses Buches: ${outcomeConcept}`,
        ],
        estimatedWords: 1600,
      },
      {
        partLabel: 'Teil I · Klare Diagnose',
        title: hints.mythTitle,
        goal: 'Verbreitete Mythen und laute Versprechen sachlich entzaubern.',
        promiseLink: `Schärft das Verständnis, warum Ihr Ansatz rund um ${primaryConcept} überlegen ist.`,
        sections: [
          'Vier verbreitete Irrtümer im Praxistest',
          'Die versteckten Kosten falscher Prioritäten',
          'Woran man ein tragfähiges System sofort erkennt',
        ],
        estimatedWords: 1700,
      },
      {
        partLabel: 'Teil II · Das ruhige Gesamtsystem',
        title: `Die System-Architektur: ${primaryConcept} klar aufgebaut`,
        goal: `Das Herzstück des Buches – ${primaryConcept} – logisch, visuell und sofort begreifbar erklären.`,
        promiseLink: `Liefert die zentrale Mechanik für „${primaryConcept}“ aus dem Core Promise.`,
        sections: [
          'Die Grundprinzipien der System-Architektur',
          `Wie ${primaryConcept} Schritt für Schritt ineinandergreift`,
          'Sofort-Start: Was Sie heute in 30 Minuten festlegen',
        ],
        estimatedWords: 2300,
      },
      {
        partLabel: 'Teil II · Das ruhige Gesamtsystem',
        title: `${secondaryConcept}: Vom Wissen zur automatischen Umsetzung`,
        goal: `Den zweiten Haupthebel (${secondaryConcept}) so strukturieren, dass er ohne tägliches Nachdenken läuft.`,
        promiseLink: `Verankert ${secondaryConcept} als festen Pfeiler des Buchversprechens.`,
        sections: [
          `Die wichtigsten Bausteine von ${secondaryConcept}`,
          'Entscheidungsmatrix für die Praxis',
          'Häufige Fehler bei der Einrichtung vermeiden',
        ],
        estimatedWords: 2100,
      },
      {
        partLabel: 'Teil II · Das ruhige Gesamtsystem',
        title: `Einfachheit im Betrieb: Ihr Ablauf ${cadenceText}`,
        goal: `Zeigen, wie das Gesamtsystem ${cadenceText} gewartet und gesteuert wird.`,
        promiseLink: `Beweist die Alltagstauglichkeit (${cadenceText}) aus dem Core Promise.`,
        sections: [
          `Wiederkehrende Routine ${cadenceText}`,
          `Steuerung über wenige Kennzahlen (${hints.metricLabel})`,
          'Klare Grenzen: Was Sie bewusst ignorieren dürfen',
        ],
        estimatedWords: 1900,
      },
      {
        partLabel: 'Teil III · Robustheit & Meisterschaft',
        title: hints.obstacleTitle,
        goal: 'Das System gegen Stress, Ausnahmen und Rückschläge absichern.',
        promiseLink: `Sorgt dafür, dass ${outcomeConcept} auch im Gegenwind stabil bleibt.`,
        sections: [
          'Stresstest: Wo Systeme in der Realität brechen',
          'Ihr persönliches Regelwerk für Ausnahmesituationen',
          'Ruhig bleiben, wenn andere hektisch reagieren',
        ],
        estimatedWords: 1900,
      },
      {
        partLabel: 'Teil III · Robustheit & Meisterschaft',
        title: `Praxisbeispiele & Feintuning für ${tertiaryConcept}`,
        goal: 'Anhand realer Fallstudien zeigen, wie sich das System an individuelle Situationen anpasst.',
        promiseLink: `Macht das Core Promise für unterschiedliche Leser-Ausgangslagen greifbar.`,
        sections: [
          'Drei typische Ausgangssituationen im Vergleich',
          'Stellschrauben für noch mehr Wirkung',
          'Die häufigsten Leserfragen prägnant beantwortet',
        ],
        estimatedWords: 1800,
      },
      {
        partLabel: 'Teil III · Robustheit & Meisterschaft',
        title: `Abschluss: Ihr dauerhaftes System für ${outcomeConcept}`,
        goal: 'Alle Werkzeuge in einer kompakten Umsetzungs-Roadmap bündeln.',
        promiseLink: `Schließt den Bogen zum Core Promise und führt direkt ins Handeln.`,
        sections: [
          'Ihre Umsetzungs-Checkliste auf einer Seite',
          'Die ersten drei Schritte für diese Woche',
          'Langfristige Pflege ohne Aufwand',
        ],
        estimatedWords: 1500,
      },
      {
        partLabel: 'Teil II · Das ruhige Gesamtsystem',
        title: `Werkzeuge & Vorlagen für ${primaryConcept}`,
        goal: 'Konkrete Muster, Rechen- oder Gesprächsvorlagen zum direkten Nachbauen liefern.',
        promiseLink: `Reduziert die Einstiegshürde in das versprochene System auf ein Minimum.`,
        sections: [
          'Muster-Vorlage zum direkten Übernehmen',
          'Beispielhafte Ausfüllhilfe',
          'Schnellprüfung nach dem ersten Durchlauf',
        ],
        estimatedWords: 1700,
      },
      {
        partLabel: 'Teil III · Robustheit & Meisterschaft',
        title: 'Ausblick & langfristige Souveränität',
        goal: 'Perspektive über die ersten Monate hinaus öffnen.',
        promiseLink: `Festigt die dauerhafte Wirkung des Core Promise über Jahre.`,
        sections: [
          'Wie sich kleine Verbesserungen über Jahre potenzieren',
          'Der jährliche System-Check',
          'Schlussgedanke für Ihren weiteren Weg',
        ],
        estimatedWords: 1400,
      },
    ];
  }

  // Default: 'praxis-leitfaden'
  return [
    {
      partLabel: 'Teil I · Fundament & Klarheit',
      title: `Einstieg: Mit ${primaryConcept} gezielt zu mehr ${outcomeConcept}`,
      goal: `Den Leser dort abholen, wo ${hints.painPoint} belasten, und das Kernversprechen des Buches klar einführen.`,
      promiseLink: `Etabliert unmittelbar die Leitidee aus dem Core Promise: „${corePromiseText}“`,
      sections: [
        `Warum der klassische Weg bei ${pillarDef.label} oft zu Unruhe führt`,
        'Was Menschen mit stabilen Ergebnissen anders machen',
        `Ihr Fahrplan durch „${book.title}“`,
      ],
      estimatedWords: 1700,
    },
    {
      partLabel: 'Teil I · Fundament & Klarheit',
      title: hints.mythTitle,
      goal: 'Die wichtigsten Denkfehler auflösen und klare Entscheidungskriterien für den Alltag legen.',
      promiseLink: `Schafft das gedankliche Fundament, damit ${primaryConcept} ohne Zweifel umgesetzt wird.`,
      sections: [
        'Drei verbreitete Irrtümer im Alltagstest',
        'Einfachheit schlägt Perfektion: Das Prinzip robuster Strukturen',
        'Kurzer Selbst-Check Ihrer bisherigen Gewohnheiten',
      ],
      estimatedWords: 1800,
    },
    {
      partLabel: 'Teil II · Das Kern-System in der Praxis',
      title: `Das Herzstück: ${primaryConcept} klar und einfach aufsetzen`,
      goal: `Die zentrale Methode (${primaryConcept}) Schritt für Schritt und ohne Fachjargon erklären.`,
      promiseLink: `Löst den Hauptteil des Core Promise (${primaryConcept}) konkret und nachvollziehbar ein.`,
      sections: [
        `Wie ${primaryConcept} aufgebaut ist`,
        'Schritt-für-Schritt-Anleitung für die Ersteinrichtung',
        `Praxis-Check für ${audienceShort}`,
      ],
      estimatedWords: 2300,
    },
    {
      partLabel: 'Teil II · Das Kern-System in der Praxis',
      title: `${secondaryConcept} richtig nutzen und langfristig steuern`,
      goal: `Den zweiten entscheidenden Baustein (${secondaryConcept}) mit klaren Beispielen und Regeln ausarbeiten.`,
      promiseLink: `Verknüpft ${secondaryConcept} direkt mit dem versprochenen Nutzen (${outcomeConcept}).`,
      sections: [
        `Die Mechanik hinter ${secondaryConcept} verständlich erklärt`,
        'Konkretes Praxisbeispiel mit klaren Ergebnissen',
        `Die wichtigsten Kennzahlen (${hints.metricLabel})`,
      ],
      estimatedWords: 2200,
    },
    {
      partLabel: 'Teil II · Das Kern-System in der Praxis',
      title: `Die Routine ${cadenceText}: Wie das System im Alltag trägt`,
      goal: `Einen realistischen, zeitsparenden Ablauf ${cadenceText} gestalten, der dauerhaft durchhaltbar ist.`,
      promiseLink: `Erfüllt das konkrete Umsetzungs- und Zeitversprechen (${cadenceText}) aus dem Core Promise.`,
      sections: [
        `Ihr kompakter Ablauf ${cadenceText}`,
        'Wie Sie Automatisierung und feste Anker für sich nutzen',
        'Typische Reibungspunkte im Alltag gezielt beseitigen',
      ],
      estimatedWords: 2000,
    },
    {
      partLabel: 'Teil III · Krisenfestigkeit & Umsetzung',
      title: hints.obstacleTitle,
      goal: 'Einen verbindlichen Plan für Gegenwind, Rückfälle und Stressphasen formulieren.',
      promiseLink: `Stellt sicher, dass das Core Promise auch unter realem Alltagsdruck Bestand hat.`,
      sections: [
        'Warum gute Vorsätze im Stress kippen – und was stattdessen hilft',
        'Ihr persönlicher Notfall- und Gegenwind-Plan',
        `Klarheit behalten für mehr ${outcomeConcept}`,
      ],
      estimatedWords: 1800,
    },
    {
      partLabel: 'Teil III · Krisenfestigkeit & Umsetzung',
      title: `Praxisbeispiele & Varianten rund um ${tertiaryConcept}`,
      goal: 'Zeigen, wie verschiedene Lebenssituationen das System passgenau für sich anwenden.',
      promiseLink: `Überträgt das Core Promise auf unterschiedliche Ausgangslagen innerhalb Ihrer Zielgruppe.`,
      sections: [
        'Szenario A: Einstieg bei null mit klarem Minimal-Setup',
        'Szenario B: Bestehende Strukturen aufräumen und vereinfachen',
        'Häufige Fragen aus der Praxis präzise beantwortet',
      ],
      estimatedWords: 1900,
    },
    {
      partLabel: 'Teil III · Krisenfestigkeit & Umsetzung',
      title: `Ihr Start-Fahrplan: In wenigen Schritten zur ${outcomeConcept}`,
      goal: 'Das gesamte Buch in eine direkt umsetzbare Checkliste und ein klares Schlussfazit verdichten.',
      promiseLink: `Schließt das Buch mit einem klaren Umsetzungs-Impuls genau entlang des Core Promise.`,
      sections: [
        'Die komplette Umsetzungs-Checkliste auf einen Blick',
        'Ihre ersten drei Schritte für die kommenden 7 Tage',
        'Schlusswort: Warum ruhige Konsequenz immer gewinnt',
      ],
      estimatedWords: 1600,
    },
    {
      partLabel: 'Teil II · Das Kern-System in der Praxis',
      title: `Typische Stolpersteine bei ${primaryConcept} frühzeitig erkennen`,
      goal: 'Die häufigsten Umsetzungsfehler benennen und mit klaren Korrekturen entschärfen.',
      promiseLink: `Bewahrt den Leser vor kostspieligen oder frustrierenden Umwegen auf dem Weg zum Core Promise.`,
      sections: [
        'Fünf leise Fehler, die fast jeder am Anfang macht',
        'Schnelle Korrekturmaßnahmen für die Praxis',
        'Wann weniger Anpassung zu besseren Ergebnissen führt',
      ],
      estimatedWords: 1700,
    },
    {
      partLabel: 'Teil III · Krisenfestigkeit & Umsetzung',
      title: 'Arbeitsblätter, Checklisten & Jahres-Check',
      goal: 'Kompakte Vorlagen zum direkten Ausfüllen und jährlichen Nachsteuern bereitstellen.',
      promiseLink: `Macht das System aus „${book.title}“ zu einem dauerhaften Arbeitsbuch.`,
      sections: [
        'Kompakte Vorlage für Ihren Start',
        'Das jährliche Kurz-Review in 20 Minuten',
        'Raum für Ihre eigenen Regeln und Meilensteine',
      ],
      estimatedWords: 1400,
    },
  ];
}

/**
 * Selects a balanced subset of N chapters (preserving Beginning -> Core System -> Closing arc)
 * from the 10-chapter dramaturgic blueprint.
 */
function pickBalancedIndices(totalSlots: number, targetCount: number): number[] {
  const count = Math.max(3, Math.min(targetCount, totalSlots));
  if (count === 5) return [0, 2, 3, 5, 7];
  if (count === 6) return [0, 1, 2, 3, 4, 5];
  if (count === 8) return [0, 1, 2, 3, 4, 5, 6, 7];
  if (count === 10) return [0, 1, 2, 3, 8, 4, 5, 6, 7, 9];

  const indices: number[] = [];
  for (let i = 0; i < count; i++) {
    indices.push(i);
  }
  return indices;
}

/**
 * Automatically generates a structured German chapter Table of Contents proposal
 * anchored directly to the current book project's Core Promise.
 */
export function generateTocFromCorePromise(
  book: BookProject,
  options?: {
    chapterCount?: number;
    structureStyle?: TocStructureStyle;
  }
): TocProposalResult {
  const structureStyle: TocStructureStyle = options?.structureStyle || 'praxis-leitfaden';
  const chapterCount = Math.max(4, Math.min(10, options?.chapterCount || 6));

  const { corePromiseText, concepts, timeAnchor } = extractCorePromiseConcepts(book);
  const allSlots = buildBlueprintSlots(book, structureStyle, corePromiseText, concepts, timeAnchor);
  const chosenIndices = pickBalancedIndices(allSlots.length, chapterCount);

  const chapters: TocChapterProposal[] = chosenIndices.map((slotIndex, idx) => {
    const slot = allSlots[slotIndex];
    return {
      id: `toc-${structureStyle}-${idx + 1}`,
      chapterNumber: idx + 1,
      partLabel: slot.partLabel,
      title: slot.title,
      goal: slot.goal,
      promiseLink: slot.promiseLink,
      sections: [...slot.sections],
      estimatedWords: slot.estimatedWords,
      included: true,
    };
  });

  const totalEstimatedWords = chapters.reduce((sum, ch) => sum + ch.estimatedWords, 0);

  return {
    structureStyle,
    corePromiseUsed: corePromiseText,
    extractedConcepts: concepts,
    totalEstimatedWords,
    chapters,
    source: 'auto',
  };
}

/**
 * Converts selected TOC chapter proposals into real manuscript Chapter objects,
 * optionally seeding each chapter's content with formatted ## sub-section headings.
 */
export function convertTocProposalsToChapters(
  proposals: TocChapterProposal[],
  options?: { includeSectionsInContent?: boolean }
): Chapter[] {
  const includeSections = options?.includeSectionsInContent !== false;
  const active = proposals.filter((p) => p.included && p.title.trim().length > 0);
  const stamp = Date.now();

  return active.map((item, idx) => {
    const content = includeSections
      ? [
          `> Kapitel-Fokus (Core Promise): ${item.promiseLink}`,
          '',
          ...item.sections.flatMap((sec) => [`## ${sec}`, '', '']),
        ]
          .join('\n')
          .trim()
      : '';

    return {
      id: `ch-toc-${stamp}-${idx + 1}`,
      title: item.title.trim(),
      goal: item.goal.trim(),
      content,
      annotations: [],
      lastRevisionSummary: 'Aus Core-Promise-Inhaltsverzeichnis angelegt',
    };
  });
}

/**
 * Formats a structured TOC proposal as clean German plain text for copying/exporting.
 */
export function formatTocAsPlainText(result: TocProposalResult, bookTitle: string): string {
  const lines: string[] = [
    `INHALTSVERZEICHNIS-VORSCHLAG: ${bookTitle}`,
    `Core Promise: ${result.corePromiseUsed}`,
    '='.repeat(60),
    '',
  ];

  let lastPart = '';
  result.chapters
    .filter((c) => c.included)
    .forEach((ch, idx) => {
      if (ch.partLabel && ch.partLabel !== lastPart) {
        if (lastPart) lines.push('');
        lines.push(ch.partLabel.toUpperCase());
        lines.push('-'.repeat(40));
        lastPart = ch.partLabel;
      }
      lines.push(`Kapitel ${idx + 1}: ${ch.title}`);
      lines.push(`  Ziel: ${ch.goal}`);
      lines.push(`  Core-Promise-Bezug: ${ch.promiseLink}`);
      ch.sections.forEach((sec, sIdx) => {
        lines.push(`    ${idx + 1}.${sIdx + 1} ${sec}`);
      });
      lines.push('');
    });

  return lines.join('\n').trim();
}
