import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL_NAME = 'gemini-4-hydrogen';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY ist nicht konfiguriert. Bitte prüfen Sie Einstellungen > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function handleAiError(res: express.Response, error: unknown, fallbackLabel: string) {
  const rawMessage = error instanceof Error ? error.message : String(error);
  console.error(`[AI Route Error - ${fallbackLabel}]:`, rawMessage);
  let status = 500;
  let userMessage = `${fallbackLabel} fehlgeschlagen: ${rawMessage}`;

  if (rawMessage.includes('API_KEY') || rawMessage.includes('403') || rawMessage.includes('PERMISSION_DENIED')) {
    status = 403;
    userMessage = 'API-Schlüssel ungültig oder nicht autorisiert. Bitte prüfen Sie Settings > Secrets.';
  } else if (rawMessage.includes('429') || rawMessage.includes('RESOURCE_EXHAUSTED')) {
    status = 429;
    userMessage = 'Anfragelimit vorübergehend erreicht. Bitte versuchen Sie es in einem Moment erneut.';
  } else if (rawMessage.includes('404') || rawMessage.includes('NOT_FOUND')) {
    status = 404;
    userMessage = 'Das konfigurierte KI-Modell wurde nicht gefunden.';
  }

  res.status(status).json({ error: userMessage });
}

const PILLAR_GUIDANCE: Record<string, string> = {
  geld: 'Schwerpunkt GELD: Wohlstand, finanzielle Souveränität, Vermögensaufbau, klare Zahlen, umsetzbare Systeme statt leerer Versprechen, langfristige Sicherheit.',
  beziehung: 'Schwerpunkt BEZIEHUNG: Partnerschaft, tiefe Verbundenheit, gesunde Grenzen, ehrliche Kommunikation, Empathie, alltagstaugliche Dialogbeispiele.',
  glueck: 'Schwerpunkt GLÜCK: Lebenssinn, innere Klarheit, Resilienz, Zufriedenheit, psychologisch fundierte Gewohnheiten ohne kitschige Floskeln.',
  gesundheit: 'Schwerpunkt GESUNDHEIT: Energie, Schlaf, Stressregulation, Bewegung, Ernährung und Langlebigkeit, evidenzbasiert mit klarem Haftungsausschluss bei medizinischen Themen.',
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      model: MODEL_NAME,
      aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // 1. Generate guided book concept & chapter outline anchored to the evergreen pillar
  app.post('/api/ai/outline', async (req, res) => {
    try {
      const { pillar, topicIdea, targetAudience, corePromise, tone, chapterCount } = req.body ?? {};
      if (!pillar || !topicIdea) {
        return res.status(400).json({ error: 'Bitte wählen Sie ein Grundbedürfnis und geben Sie eine Buchidee an.' });
      }

      const ai = getAiClient();
      const count = Math.min(Math.max(Number(chapterCount) || 6, 3), 12);
      const pillarNote = PILLAR_GUIDANCE[pillar] || PILLAR_GUIDANCE.geld;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Entwickle ein verkaufsstarkes, seriöses deutschsprachiges Amazon-KDP-Sachbuchkonzept mit exakt ${count} Kapiteln.

Grundbedürfnis-Schwerpunkt (verpflichtend): ${pillar.toUpperCase()}
${pillarNote}

Buchidee / Arbeitsthema: ${topicIdea}
Zielgruppe: ${targetAudience || 'Berufstätige im deutschsprachigen Raum, 28–55 Jahre'}
Kernversprechen: ${corePromise || 'Klarer, alltagstauglicher Leitfaden mit messbarem Nutzen'}
Stil & Tonalität: ${tone || 'Sachlich, warm, präzise, ohne Hype'}

Liefere Titel, Untertitel, verfeinertes Kernversprechen, prägnante Klappentext-Idee sowie ${count} logisch aufeinander aufbauende Kapitel (inkl. Einleitung und Umsetzungs-Abschluss) mit jeweils konkreter Kapitel-Zielsetzung.`,
        config: {
          systemInstruction:
            'Du bist ein erfahrener Cheflektor für deutschsprachige Sachbuch-Bestseller auf Amazon KDP. Du schreibst klares, präzises Deutsch ohne Floskeln oder übertriebene Werbesprache.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              subtitle: { type: Type.STRING },
              corePromise: { type: Type.STRING },
              backCoverBlurb: { type: Type.STRING },
              chapters: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    goal: { type: Type.STRING },
                    keyPoints: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: ['title', 'goal', 'keyPoints'],
                },
              },
            },
            required: ['title', 'subtitle', 'corePromise', 'backCoverBlurb', 'chapters'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (error) {
      handleAiError(res, error, 'Buchkonzept-Generierung');
    }
  });

  // 2. Draft or expand a chapter with full book & pillar continuity
  app.post('/api/ai/write-chapter', async (req, res) => {
    try {
      const { bookTitle, bookSubtitle, pillar, targetAudience, tone, chapterTitle, chapterGoal, existingContent, previousChapterSummary, lengthHint } = req.body ?? {};
      if (!chapterTitle) {
        return res.status(400).json({ error: 'Kapiteltitel fehlt.' });
      }

      const ai = getAiClient();
      const pillarNote = PILLAR_GUIDANCE[pillar] || PILLAR_GUIDANCE.geld;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Schreibe ein hochwertiges, druckreifes Buchkapitel auf Deutsch für folgendes Amazon-KDP-Sachbuch:

Buchtitel: ${bookTitle}
Untertitel: ${bookSubtitle || ''}
Verpflichtendes Grundbedürfnis: ${pillarNote}
Zielgruppe: ${targetAudience || 'Deutschsprachige Sachbuchleser'}
Tonalität: ${tone || 'Klar, strukturiert, praxisnah'}

Kapitel: ${chapterTitle}
Ziel dieses Kapitels: ${chapterGoal || 'Konkreter Erkenntnisgewinn und direkte Umsetzbarkeit'}
Kontext aus vorherigem Kapitel: ${previousChapterSummary || 'Erstes Kapitel bzw. direkter Einstieg'}
Gewünschter Umfang: ${lengthHint || 'ca. 650–900 Wörter mit Zwischenüberschriften (## ), konkreten Beispielen und einer kompakten Praxis-Übung am Ende'}
${existingContent ? `\nBestehende Notizen oder Entwurf, die sinnvoll integriert/ausgebaut werden sollen:\n${existingContent}` : ''}

Formatiere den Text sauber in Buchsatz-Absätzen mit optionalen Zwischenüberschriften (## Zwischenüberschrift) und klaren Aufzählungen, ohne Meta-Kommentare vor oder nach dem Kapiteltext.`,
        config: {
          systemInstruction:
            'Du bist ein professioneller deutschsprachiger Sachbuchautor. Du schreibst lebendig, fundiert und gut lesbar für Kindle und Taschenbuch. Gib ausschließlich den fertigen Kapiteltext zurück.',
        },
      });

      res.json({ content: (response.text ?? '').trim() });
    } catch (error) {
      handleAiError(res, error, 'Kapitel-Erstellung');
    }
  });

  // 3. Author Proofreading & Revision Loop: apply author annotations & corrections to chapter
  app.post('/api/ai/revise-chapter', async (req, res) => {
    try {
      const { bookTitle, pillar, tone, chapterTitle, content, annotations } = req.body ?? {};
      if (!content || !Array.isArray(annotations) || annotations.length === 0) {
        return res.status(400).json({ error: 'Es sind keine offenen Korrekturen oder Anmerkungen zur Überarbeitung vorhanden.' });
      }

      const ai = getAiClient();
      const pillarNote = PILLAR_GUIDANCE[pillar] || PILLAR_GUIDANCE.geld;
      const annotationList = annotations
        .map(
          (a: { id: string; category: string; quote?: string; note: string }, idx: number) =>
            `${idx + 1}. [ID: ${a.id}] Kategorie: ${a.category}${a.quote ? ` | Textstelle: "${a.quote}"` : ''} | Korrekturwunsch des Autors: ${a.note}`
        )
        .join('\n');

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Du überarbeitest das folgende Buchkapitel präzise anhand der Gegenlese-Anmerkungen des Autors.

Buch: ${bookTitle}
Grundbedürfnis: ${pillarNote}
Tonalität: ${tone || 'Klar, seriös, praxisnah'}
Kapitel: ${chapterTitle}

--- AKTUELLER KAPITELTEXT ---
${content}
--- ENDE KAPITELTEXT ---

--- ANMERKUNGEN & KORREKTUREN DES AUTORS ---
${annotationList}
--- ENDE ANMERKUNGEN ---

Aufgabe:
1. Arbeite JEDE Anmerkung sorgfältig und organisch in den Kapiteltext ein, ohne unbetroffene Passagen unnötig zu zerstören.
2. Behalte eine saubere Buchsatz-Struktur (Absätze, ## Zwischenüberschriften) bei.
3. Dokumentiere im Feld "revisionNotes" kurz für jede bearbeitete Anmerkung, was genau angepasst wurde.`,
        config: {
          systemInstruction:
            'Du bist ein präziser Verlagslektor. Du setzt Autoren-Korrekturen exakt um und lieferst den vollständig überarbeiteten Kapiteltext sowie ein knappes Änderungsprotokoll als JSON.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              revisedContent: { type: Type.STRING },
              summary: { type: Type.STRING },
              appliedAnnotations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    resolutionNote: { type: Type.STRING },
                  },
                  required: ['id', 'resolutionNote'],
                },
              },
            },
            required: ['revisedContent', 'summary', 'appliedAnnotations'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (error) {
      handleAiError(res, error, 'Lektorats-Überarbeitung');
    }
  });

  // 4. Cover art direction & back-cover copy
  app.post('/api/ai/cover-concept', async (req, res) => {
    try {
      const { pillar, title, subtitle, targetAudience, corePromise } = req.body ?? {};
      const ai = getAiClient();

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Entwickle ein professionelles Amazon-KDP-Cover-Konzept für ein deutschsprachiges Sachbuch:
Grundbedürfnis: ${pillar}
Titel: ${title}
Untertitel: ${subtitle}
Zielgruppe: ${targetAudience}
Kernversprechen: ${corePromise}

Liefere:
- Einen kurzen oberen Eyebrow-Satz (z. B. "Der Praxisleitfaden für ...")
- Einen überzeugenden Buchrücken-Klappentext (max. 90 Wörter) für die Taschenbuch-Rückseite
- Eine Empfehlung für das Cover-Layout ("editorial" | "minimal" | "frame" | "band")
- Eine konkrete Typografie- & Farbwirkungs-Empfehlung auf Deutsch
- Einen detaillierten Bild-Prompt (Englisch, für hochwertige Cover-Artwork-Generierung ohne Text im Bild).`,
        config: {
          systemInstruction:
            'Du bist Art Director in einem renommierten deutschen Sachbuchverlag mit Fokus auf hohe Klickraten bei Amazon-KDP-Thumbnails.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              eyebrow: { type: Type.STRING },
              backCoverBlurb: { type: Type.STRING },
              recommendedLayout: { type: Type.STRING },
              artDirectionNote: { type: Type.STRING },
              imagePrompt: { type: Type.STRING },
            },
            required: ['eyebrow', 'backCoverBlurb', 'recommendedLayout', 'artDirectionNote', 'imagePrompt'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (error) {
      handleAiError(res, error, 'Cover-Konzept');
    }
  });

  // 4b. Cover Generator Mode A: Dedicated prompts only (separate for Print Book & Kindle eBook)
  app.post('/api/ai/cover-prompts', async (req, res) => {
    try {
      const { pillar, title, subtitle, targetAudience, corePromise, styleLabel } = req.body ?? {};
      const ai = getAiClient();
      const pillarNote = PILLAR_GUIDANCE[pillar] || PILLAR_GUIDANCE.geld;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Erstelle zwei maßgeschneiderte, sofort kopierbare KI-Bildgenerierungs-Prompts (auf Englisch, OHNE Text im Bild) für dasselbe Sachbuch – bewusst unterschiedlich optimiert für:
1) TASCHENBUCH (Print-Cover): Haptische Verlagsqualität, edle Ruhe, großzügiger Raum im oberen Drittel für Serifen-Typografie.
2) KINDLE-VERSION (E-Book-Cover 1600×2560): Hoher Kontrast, eigenständiges prägnantes Leitmotiv, maximale Klickrate und Lesbarkeit im kleinen Amazon-Suchergebnis-Thumbnail.

Buchtitel: ${title}
Untertitel: ${subtitle || ''}
Grundbedürfnis: ${pillarNote}
Zielgruppe: ${targetAudience || 'Deutschsprachige Sachbuchleser'}
Core Promise: ${corePromise || ''}
Gewünschte Stilrichtung: ${styleLabel || 'Editorial Sachbuch (Zeitlos & Hochwertig)'}

Liefere außerdem einen präzisen Negative-Prompt (Englisch) sowie einen kurzen deutschen Typografie- & Umsetzungshinweis.`,
        config: {
          systemInstruction:
            'Du bist ein erfahrener Buchcover-Art-Director für Amazon KDP (DACH). Du schreibst extrem präzise, kunstvolle Bild-Prompts ohne Text-Elemente im Bild als JSON.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              printPrompt: { type: Type.STRING },
              kindlePrompt: { type: Type.STRING },
              negativePrompt: { type: Type.STRING },
              typographyNote: { type: Type.STRING },
            },
            required: ['printPrompt', 'kindlePrompt', 'negativePrompt', 'typographyNote'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (error) {
      handleAiError(res, error, 'Cover-Prompt-Generierung');
    }
  });

  // 4c. Cover Generator Mode B: Auto-Modus generating two complete, distinct cover designs (Print Book + Kindle)
  app.post('/api/ai/cover-auto', async (req, res) => {
    try {
      const { pillar, title, subtitle, author, targetAudience, corePromise, styleLabel } = req.body ?? {};
      const ai = getAiClient();
      const pillarNote = PILLAR_GUIDANCE[pillar] || PILLAR_GUIDANCE.geld;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Entwirf im Auto-Modus ZWEI vollständige, visuell deutlich eigenständige Buchcover-Designs für dasselbe deutschsprachige Amazon-KDP-Sachbuch:
1) printCover (Taschenbuch / gedrucktes Buch): Ruhige, haptische Verlagsästhetik, ideal für den Buchhandel und gedruckte Umschläge.
2) kindleCover (Kindle E-Book-Version): Bewusst eigenständiges, kontrastreicheres Design (anderes Motiv, andere Farbpalette, z. B. dunkler kontrastreicher Hintergrund oder markantes Kontrast-Band) für maximale Thumbnail-Wirkung im Kindle-Shop.

Buchtitel: ${title}
Untertitel: ${subtitle || ''}
Autor: ${author || ''}
Grundbedürfnis: ${pillarNote}
Zielgruppe: ${targetAudience || ''}
Core Promise: ${corePromise || ''}
Stilrichtung: ${styleLabel || 'Editorial Sachbuch'}

Erlaubte Werte:
- motifStyle: exakt einer von "arch" | "waves" | "botanical" | "prism" | "horizon" | "monolith" (wähle für printCover und kindleCover UNTERSCHIEDLICHE Motive!)
- layout: exakt einer von "editorial" | "minimal" | "frame" | "band"
- titleFont: "serif" | "sans"
- textColor: "dark" | "light" (stelle sicher, dass textColor hohen Kontrast zu primaryColor/secondaryColor hat!)
- primaryColor, secondaryColor, accentColor: valide 6-stellige Hex-Farbcodes (#RRGGBB)
- scrimOpacity: Ganzzahl zwischen 6 und 45
- finish: "matt" | "glaenzend"
Liefere zusätzlich backCoverBlurb (max. 85 Wörter, Deutsch), spineText, sowie je einen englischen imagePrompt für Print & Kindle.`,
        config: {
          systemInstruction:
            'Du bist Chef-Art-Director für Amazon-KDP-Bestseller. Du lieferst druckreife, kontrastgeprüfte Design-Spezifikationen für ein Taschenbuch-Cover und ein eigenständiges Kindle-Cover als JSON.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              backCoverBlurb: { type: Type.STRING },
              spineText: { type: Type.STRING },
              finish: { type: Type.STRING },
              printCover: {
                type: Type.OBJECT,
                properties: {
                  motifStyle: { type: Type.STRING },
                  primaryColor: { type: Type.STRING },
                  secondaryColor: { type: Type.STRING },
                  accentColor: { type: Type.STRING },
                  layout: { type: Type.STRING },
                  eyebrow: { type: Type.STRING },
                  titleFont: { type: Type.STRING },
                  textColor: { type: Type.STRING },
                  scrimOpacity: { type: Type.INTEGER },
                  artDirectionNote: { type: Type.STRING },
                  imagePrompt: { type: Type.STRING },
                },
                required: [
                  'motifStyle',
                  'primaryColor',
                  'secondaryColor',
                  'accentColor',
                  'layout',
                  'eyebrow',
                  'titleFont',
                  'textColor',
                  'scrimOpacity',
                  'artDirectionNote',
                  'imagePrompt',
                ],
              },
              kindleCover: {
                type: Type.OBJECT,
                properties: {
                  motifStyle: { type: Type.STRING },
                  primaryColor: { type: Type.STRING },
                  secondaryColor: { type: Type.STRING },
                  accentColor: { type: Type.STRING },
                  layout: { type: Type.STRING },
                  eyebrow: { type: Type.STRING },
                  titleFont: { type: Type.STRING },
                  textColor: { type: Type.STRING },
                  scrimOpacity: { type: Type.INTEGER },
                  artDirectionNote: { type: Type.STRING },
                  imagePrompt: { type: Type.STRING },
                },
                required: [
                  'motifStyle',
                  'primaryColor',
                  'secondaryColor',
                  'accentColor',
                  'layout',
                  'eyebrow',
                  'titleFont',
                  'textColor',
                  'scrimOpacity',
                  'artDirectionNote',
                  'imagePrompt',
                ],
              },
            },
            required: ['backCoverBlurb', 'spineText', 'finish', 'printCover', 'kindleCover'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (error) {
      handleAiError(res, error, 'Auto-Cover-Erstellung');
    }
  });

  // 5. KDP Marketing & Metadata AI execution (HTML Description, 7 Backend Keywords, Categories, etc.)
  app.post('/api/ai/kdp-marketing', async (req, res) => {
    try {
      const { mode, customPrompt, bookContext } = req.body ?? {};
      if (!customPrompt) {
        return res.status(400).json({ error: 'Prompt darf nicht leer sein.' });
      }

      const ai = getAiClient();

      if (mode === 'full-metadata') {
        const response = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: `${customPrompt}\n\nBuchkontext:\n${JSON.stringify(bookContext, null, 2)}`,
          config: {
            systemInstruction:
              'Du bist ein Amazon-KDP-Marketing-Spezialist für den DACH-Markt. Halte dich strikt an KDP-Regeln: HTML-Beschreibung erlaubt nur <b>, <i>, <br>, <ul>, <li>, <h4>, <p> (unter 3500 Zeichen). Exakt 7 Backend-Keywords, jedes strikt unter 48 Bytes, keine Wiederholung von Wörtern aus Titel/Untertitel, keine Markennamen oder "Bestseller"-Claims. Exakt 3 passende deutschsprachige Amazon-KDP-Kategorien.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                descriptionHtml: { type: Type.STRING },
                keywords: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                categories: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                subtitleSuggestions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['descriptionHtml', 'keywords', 'categories', 'subtitleSuggestions'],
            },
          },
        });
        const parsed = JSON.parse((response.text ?? '{}').trim());
        return res.json(parsed);
      }

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `${customPrompt}\n\nBuchkontext:\n${JSON.stringify(bookContext, null, 2)}`,
        config: {
          systemInstruction:
            'Du bist ein erfahrener Amazon-KDP-Verlagsstratege für den deutschsprachigen Markt. Antworte klar, direkt verwendbar und strikt KDP-richtlinienkonform.',
        },
      });

      res.json({ output: (response.text ?? '').trim() });
    } catch (error) {
      handleAiError(res, error, 'KDP-Marketing-Generierung');
    }
  });

  // 6. Schreib-Co-Pilot: generate 3 chapter-level prose segment proposals anchored to Core Promise
  app.post('/api/ai/copilot-suggestions', async (req, res) => {
    try {
      const {
        bookTitle,
        bookSubtitle,
        pillar,
        corePromise,
        targetAudience,
        tone,
        chapterTitle,
        chapterGoal,
        existingContent,
        segmentType,
        directionHint,
      } = req.body ?? {};

      if (!chapterTitle) {
        return res.status(400).json({ error: 'Aktives Kapitel fehlt.' });
      }

      const ai = getAiClient();
      const pillarNote = PILLAR_GUIDANCE[pillar] || PILLAR_GUIDANCE.geld;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Du bist der Schreib-Co-Pilot für ein deutschsprachiges Amazon-KDP-Sachbuch.
Erstelle exakt 3 unterschiedliche, sofort einsetzbare Textabschnitt-Vorschläge für das aktuelle Kapitel, die konsequent auf das zentrale Buchversprechen (Core Promise) einzahlen.

Buchtitel: ${bookTitle}
Untertitel: ${bookSubtitle || ''}
Verpflichtendes Grundbedürfnis: ${pillarNote}
Zentrales Buchversprechen (Core Promise): ${corePromise || 'Klarer, praxisnaher Leitfaden'}
Zielgruppe: ${targetAudience || 'Deutschsprachige Sachbuchleser'}
Tonalität: ${tone || 'Klar, warm, präzise'}

Aktuelles Kapitel: ${chapterTitle}
Kapitelziel: ${chapterGoal || 'Konkreter Nutzen für den Leser'}
Gewünschter Abschnittstyp: ${segmentType || 'Kernargument & Praxisvertiefung'}
Zusätzlicher Wunsch des Autors: ${directionHint || 'Keiner – wähle drei starke, abwechslungsreiche Perspektiven'}

Auszug aus dem bisherigen Kapiteltext (zur stilistischen Kontinuität):
${(existingContent || '(Kapitel ist noch leer)').slice(-1400)}

Liefere 3 eigenständige Vorschläge (je 120–220 Wörter pro Abschnitt, sauberer Buchsatz, keine Meta-Kommentare) mit passender Zwischenüberschrift, kurzer Erklärung warum der Abschnitt das Core Promise stärkt, und dem fertigen Textabschnitt.`,
        config: {
          systemInstruction:
            'Du bist ein erfahrener deutschsprachiger Sachbuch-Co-Autor. Liefere prägnante, leserorientierte Textabschnitte ohne Floskeln als strukturiertes JSON.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    label: { type: Type.STRING },
                    subheading: { type: Type.STRING },
                    promiseAlignment: { type: Type.STRING },
                    content: { type: Type.STRING },
                  },
                  required: ['id', 'label', 'subheading', 'promiseAlignment', 'content'],
                },
              },
            },
            required: ['suggestions'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (error) {
      handleAiError(res, error, 'Schreib-Co-Pilot Vorschläge');
    }
  });

  // 7. Research complete KDP book proposals (used by Co-Pilot & New Book Lucky-Try AI search)
  app.post('/api/ai/research-books', async (req, res) => {
    try {
      const { pillarFilter, nicheHint } = req.body ?? {};
      const ai = getAiClient();

      const pillarInstruction =
        pillarFilter && pillarFilter !== 'all' && PILLAR_GUIDANCE[pillarFilter]
          ? `Alle 3 Buchvorschläge MÜSSEN im Grundbedürfnis "${pillarFilter}" liegen. ${PILLAR_GUIDANCE[pillarFilter]}`
          : 'Verteile die 3 Buchvorschläge abwechslungsreich auf verschiedene der vier zeitlosen Grundbedürfnisse: "geld", "beziehung", "glueck", "gesundheit".';

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Recherchiere und entwirf 3 verkaufsstarke, seriöse deutschsprachige Amazon-KDP-Sachbuch-Konzepte mit echter, langfristiger Nachfrage.

${pillarInstruction}
Optionaler Nischen- oder Themenimpuls des Autors: ${nicheHint || 'Überrasche mich mit konkreten, kaufstarken Nischen mit klarem Alltagsproblem'}

Jeder Vorschlag braucht:
- id (eindeutig)
- pillar (exakt einer der Werte: "geld", "beziehung", "glueck", "gesundheit")
- title (prägnanter, merkfähiger deutscher Buchtitel)
- subtitle (klarer Nutzen-Untertitel für Amazon.de)
- targetAudience (präzise Zielgruppe)
- corePromise (klares, messbares Nutzenversprechen in 1–2 Sätzen)
- marketAngle (kurze Begründung zur Nachfrage & KDP-Positionierung)
- sampleChapters (exakt 5 logisch aufeinander aufbauende Kapiteltitel).`,
        config: {
          systemInstruction:
            'Du bist ein erfahrener Verlagsprogramm-Planer für Amazon KDP im deutschsprachigen Raum. Keine reißerischen Versprechen, sondern konkrete, kaufstarke Sachbuchkonzepte.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              ideas: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    pillar: { type: Type.STRING },
                    title: { type: Type.STRING },
                    subtitle: { type: Type.STRING },
                    targetAudience: { type: Type.STRING },
                    corePromise: { type: Type.STRING },
                    marketAngle: { type: Type.STRING },
                    sampleChapters: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: [
                    'id',
                    'pillar',
                    'title',
                    'subtitle',
                    'targetAudience',
                    'corePromise',
                    'marketAngle',
                    'sampleChapters',
                  ],
                },
              },
            },
            required: ['ideas'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (error) {
      handleAiError(res, error, 'Buchideen-Recherche');
    }
  });

  // 8. Chapter Performance AI Deep Analysis: evaluates readability, word density, and Core Promise alignment with verbatim excerpts
  app.post('/api/ai/chapter-performance', async (req, res) => {
    try {
      const { bookTitle, pillar, corePromise, chapterTitle, chapterGoal, content } = req.body ?? {};
      if (!content || !String(content).trim()) {
        return res.status(400).json({ error: 'Kein Kapiteltext zur Analyse vorhanden.' });
      }

      const ai = getAiClient();
      const pillarNote = PILLAR_GUIDANCE[pillar] || PILLAR_GUIDANCE.geld;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Führe eine präzise deutschsprachige Lektorats-Performance-Analyse für folgendes Amazon-KDP-Buchkapitel durch.
Bewerte gezielt drei Kriterien:
1. "readability" (Lesbarkeit, Satzfluss, Verständlichkeit)
2. "density" (Wortdichte, Informationsgehalt, unnötige Längen)
3. "core-promise" (Einhaltung des zentralen Buchversprechens / Core Promise und des Kapitelziels)

Buchtitel: ${bookTitle}
Grundbedürfnis: ${pillarNote}
Core Promise (Buchversprechen): ${corePromise}
Kapitel: ${chapterTitle}
Kapitelziel: ${chapterGoal}

--- KAPITELTEXT ---
${String(content).slice(0, 6000)}
--- ENDE KAPITELTEXT ---

Aufgabe:
- Gib eine knappe Gesamteinschätzung ("summary", max. 2 Sätze).
- Liefere exakt 3 konkrete, besonders wirkungsvolle Verbesserungsvorschläge ("suggestions"), möglichst je einen zu readability, density und core-promise.
- WICHTIG: Das Feld "excerpt" MUSS ein EXAKTES, WORTWÖRTLICHES Zitat (1 Satz oder markante Textstelle, 20–180 Zeichen) aus dem obigen Kapiteltext sein, damit es direkt im Text-Editor hervorgehoben werden kann.
- Liefere zu jedem Vorschlag eine direkt einsetzbare, verbesserte Formulierung ("replacement") für exakt dieses Zitat.`,
        config: {
          systemInstruction:
            'Du bist ein erfahrener Cheflektor für deutschsprachige Amazon-KDP-Sachbücher. Du lieferst präzise, umsetzbare Textstellen-Verbesserungen mit wortwörtlichen Zitaten als JSON.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              suggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    category: { type: Type.STRING },
                    severity: { type: Type.STRING },
                    title: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    suggestion: { type: Type.STRING },
                    excerpt: { type: Type.STRING },
                    replacement: { type: Type.STRING },
                  },
                  required: [
                    'id',
                    'category',
                    'severity',
                    'title',
                    'explanation',
                    'suggestion',
                    'excerpt',
                    'replacement',
                  ],
                },
              },
            },
            required: ['summary', 'suggestions'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (error) {
      handleAiError(res, error, 'Kapitel-Performance-Analyse');
    }
  });

  // 9. Structured Table of Contents proposal generated strictly from the book's Core Promise
  app.post('/api/ai/toc-from-promise', async (req, res) => {
    try {
      const {
        title,
        subtitle,
        pillar,
        corePromise,
        targetAudience,
        tone,
        chapterCount,
        structureStyle,
        focusHint,
      } = req.body ?? {};

      const ai = getAiClient();
      const count = Math.min(Math.max(Number(chapterCount) || 6, 4), 10);
      const pillarNote = PILLAR_GUIDANCE[pillar] || PILLAR_GUIDANCE.geld;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Erstelle einen strukturierten, logisch aufgebauten Inhaltsverzeichnis-Vorschlag mit exakt ${count} Kapiteln für ein deutschsprachiges Amazon-KDP-Sachbuch.
JEDES Kapitel muss klar und nachvollziehbar auf das zentrale Core Promise einzahlen.

Buchtitel: ${title || 'Unbenanntes Sachbuch'}
Untertitel: ${subtitle || ''}
Grundbedürfnis: ${pillarNote}
Zentrales Core Promise (verbindliche Leitlinie): ${corePromise || 'Klarer, praxisnaher Leitfaden'}
Zielgruppe: ${targetAudience || 'Deutschsprachige Sachbuchleser'}
Tonalität: ${tone || 'Sachlich, warm, präzise'}
Gewünschte Dramaturgie: ${structureStyle || 'praxis-leitfaden'}
Optionaler Zusatzfokus: ${focusHint || 'Keiner'}

Gliedere die ${count} Kapitel sinnvoll in 3 Buch-Teile (z. B. "Teil I · ...", "Teil II · ...", "Teil III · ...").
Für jedes Kapitel liefere:
- partLabel (Buch-Teil)
- title (prägnanter, attraktiver deutscher Kapiteltitel ohne vorangestellte Nummer)
- goal (konkretes Lern- bzw. Umsetzungsziel des Kapitels)
- promiseLink (1 präziser Satz, wie dieses Kapitel das Core Promise konkret einlöst)
- sections (exakt 3 strukturierte Unterkapitel-Überschriften)
- estimatedWords (realistische Zielwortzahl zwischen 1400 und 2600).`,
        config: {
          systemInstruction:
            'Du bist ein erfahrener Sachbuch-Programmleiter für Amazon KDP (DACH). Liefere ein verkaufsstarkes, klar gegliedertes Kapitel-Inhaltsverzeichnis als JSON.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              chapters: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    partLabel: { type: Type.STRING },
                    title: { type: Type.STRING },
                    goal: { type: Type.STRING },
                    promiseLink: { type: Type.STRING },
                    sections: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    estimatedWords: { type: Type.INTEGER },
                  },
                  required: [
                    'partLabel',
                    'title',
                    'goal',
                    'promiseLink',
                    'sections',
                    'estimatedWords',
                  ],
                },
              },
            },
            required: ['chapters'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (error) {
      handleAiError(res, error, 'Inhaltsverzeichnis-Generierung');
    }
  });

  // 10. Chapter Content Checklist AI refinement: evaluates intro, Core Promise, core argument, practical tip, and summary
  app.post('/api/ai/chapter-checklist', async (req, res) => {
    try {
      const { bookTitle, pillar, corePromise, chapterTitle, chapterGoal, content } = req.body ?? {};
      const ai = getAiClient();
      const pillarNote = PILLAR_GUIDANCE[pillar] || PILLAR_GUIDANCE.geld;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Prüfe das folgende deutschsprachige Sachbuch-Kapitel anhand einer 5-Punkte-Inhalts-Checkliste auf Basis des Core Promise:
1. "intro" (Einleitung & Leser-Hook)
2. "core-promise" (Core-Promise-Verankerung)
3. "core-argument" (Kernargument & Struktur)
4. "practical-tip" (Praxis-Tipp & Umsetzung)
5. "summary" (Zusammenfassung & Abschluss)

Buchtitel: ${bookTitle}
Grundbedürfnis: ${pillarNote}
Core Promise: ${corePromise}
Kapitel: ${chapterTitle}
Kapitelziel: ${chapterGoal}

--- AKTUELLER KAPITELTEXT ---
${String(content || '(Noch leer)').slice(0, 5000)}
--- ENDE KAPITELTEXT ---

Liefere für jedes der 5 Elemente ("id" exakt einer von "intro" | "core-promise" | "core-argument" | "practical-tip" | "summary"):
- aiNote: 1 prägnanter deutscher Lektoratshinweis speziell zu diesem Kapitel
- suggestedSnippet: Ein sofort druckreifer, konkreter Textbaustein (60–110 Wörter, sauberer Buchsatz, ggf. mit ## Zwischenüberschrift), der dieses Element für genau dieses Kapitel und Core Promise optimal ergänzt.`,
        config: {
          systemInstruction:
            'Du bist ein erfahrener Sachbuch-Lektor für Amazon KDP (DACH). Liefere präzise Checklisten-Hinweise und druckreife Ergänzungsbausteine als JSON.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    aiNote: { type: Type.STRING },
                    suggestedSnippet: { type: Type.STRING },
                  },
                  required: ['id', 'aiNote', 'suggestedSnippet'],
                },
              },
            },
            required: ['items'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (error) {
      handleAiError(res, error, 'Inhalts-Checkliste');
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VerlagsWerk KDP server running on http://localhost:${PORT}`);
  });
}

startServer();
