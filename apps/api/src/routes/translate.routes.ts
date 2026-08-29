import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface TranslateBody {
  texts?: string[];
  text?: string;
  targetLang: string;
  sourceLang?: string;
}

// In-memory server-side cache: `${sourceLang}:${targetLang}:${text}` -> translatedText
const serverTranslationCache = new Map<string, string>();

async function translateSingleText(text: string, sourceLang: string, targetLang: string): Promise<string> {
  if (!text || !text.trim() || sourceLang === targetLang) return text;

  const cacheKey = `${sourceLang}:${targetLang}:${text.trim()}`;
  if (serverTranslationCache.has(cacheKey)) {
    return serverTranslationCache.get(cacheKey)!;
  }

  try {
    // 1. Google Cloud Translation API if API key configured
    const googleApiKey = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.TRANSLATION_API_KEY;
    if (googleApiKey) {
      const url = `https://translation.googleapis.com/language/translate/v2?key=${googleApiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
          format: 'text',
        }),
      });
      if (response.ok) {
        const json = await response.json();
        const translated = json.data?.translations?.[0]?.translatedText;
        if (translated) {
          serverTranslationCache.set(cacheKey, translated);
          return translated;
        }
      }
    }

    // 2. High-performance public translation endpoint (MyMemory Translation Service)
    const pair = `${sourceLang}|${targetLang}`;
    const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(pair)}`;
    const myMemRes = await fetch(myMemoryUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (myMemRes.ok) {
      const json = await myMemRes.json();
      const translated = json.responseData?.translatedText;
      if (translated && !translated.toUpperCase().includes('MYMEMORY WARNING')) {
        serverTranslationCache.set(cacheKey, translated);
        return translated;
      }
    }
  } catch (err) {
    console.warn(`Translation error for "${text}" (${sourceLang} -> ${targetLang}):`, err);
  }

  return text;
}

export async function translateRoutes(fastify: FastifyInstance) {
  fastify.post('/translate', async (request: FastifyRequest<{ Body: TranslateBody }>, reply: FastifyReply) => {
    const { texts, text, targetLang, sourceLang = 'en' } = request.body || {};

    if (!targetLang) {
      return reply.status(400).send({ error: { code: 'INVALID_REQUEST', message: 'targetLang is required' } });
    }

    if (targetLang === sourceLang) {
      if (text) return reply.send({ translatedText: text, translations: { [text]: text } });
      if (texts) {
        const map: Record<string, string> = {};
        texts.forEach((t) => (map[t] = t));
        return reply.send({ translations: map });
      }
    }

    const inputList = texts && Array.isArray(texts) ? texts : text ? [text] : [];
    if (inputList.length === 0) {
      return reply.send({ translations: {}, translatedText: '' });
    }

    const resultMap: Record<string, string> = {};
    await Promise.all(
      inputList.map(async (str) => {
        const translated = await translateSingleText(str, sourceLang, targetLang);
        resultMap[str] = translated;
      })
    );

    return reply.send({
      translations: resultMap,
      translatedText: text ? resultMap[text] : undefined,
      sourceLang,
      targetLang,
    });
  });
}
