
import OpenAI from "openai";
import { RawArticle, GeminiAnalysisResult } from '../types'; 
import { OPENAI_MODEL_TEXT } from '../constants';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

if (!OPENAI_API_KEY || OPENAI_API_KEY === "MISSING_API_KEY_PLACEHOLDER") {
  console.error("VITE_OPENAI_API_KEY is not set in your .env.local file or is not being passed correctly. Analysis will fail or use placeholder data. Current key value:", OPENAI_API_KEY);
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY || "MISSING_API_KEY_PLACEHOLDER", // Fallback for safety, though check above should catch it.
  dangerouslyAllowBrowser: true, 
});

export const analyzeArticleContent = async (article: RawArticle): Promise<Partial<GeminiAnalysisResult> | null> => {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === "MISSING_API_KEY_PLACEHOLDER") {
    console.error("OpenAI API key is missing or placeholder. Analysis cannot proceed for article:", article.title);
    // Return a structure that matches GeminiAnalysisResult as much as possible for consistency
    return {
        importance: 0.0,
        categorie: 'flash',
        localisation: 'Clé API OpenAI manquante (vérifiez VITE_OPENAI_API_KEY dans .env.local)',
        latitude: null,
        longitude: null,
        titre: article.title,
        lien: article.link,
        date: article.pubDate || new Date().toISOString().split('T')[0],
        description: article.description || "Description non disponible.",
        imageUrl: article.imageUrl || "",
    };
  }

  const systemPrompt = `Vous êtes un analyste d'actualités expert. Votre tâche est d'analyser l'article de presse fourni et de renvoyer un objet JSON unique et valide avec des clés spécifiques en français, conformément aux instructions de l'utilisateur. N'incluez aucun texte explicatif avant ou après l'objet JSON. Assurez-vous que la sortie est uniquement l'objet JSON.`;

  const userPrompt = `
À partir des données d’article fournies (titre: "${article.title}", description: "${article.description || 'Aucune description.'}", lien: "${article.link}", datePub: "${article.pubDate || 'N/A'}"), produis un objet JSON unique et valide avec TOUS les noms de propriétés en français, comme suit :

{
  "titre": "Le titre original de l'article",
  "categorie": "...", // DOIT être l'une des valeurs suivantes (minuscules, sans accent) : flash, economie, environnement, tech, culture, urgent, international. Par défaut: "flash".
  "importance": ..., // Score décimal de 0.0 (faible) à 1.0 (élevé). Évaluer selon : impact international (plus proche de 1.0), catégorie "urgent" pondérée positivement, potentiel de viralité/partage. Nouvelles locales = score plus bas. Cohérence des scores.
  "lien": "Le lien original de l'article",
  "localisation": "...", // Localisation géographique principale (ex: "Paris, France"). Si non spécifique ou trop général (ex: "Internet"), mettre "N/A".
  "date": "...", // Date de publication originale (format YYYY-MM-DD si possible, sinon la date fournie).
  "description": "...", // Description courte et pertinente (max 150 caractères), basée sur le contenu fourni.
  "imageUrl": "...", // URL de l'image originale de l'article, si disponible dans les données d'entrée ou inférable. Sinon, chaîne vide "".
  "latitude": ..., // Latitude approximative pour "localisation". Si "localisation" est "N/A" ou non déterminable, retourner null.
  "longitude": ... // Longitude approximative pour "localisation". Si "localisation" est "N/A" ou non déterminable, retourner null.
}

Contraintes impératives :
1.  Respect strict du format JSON et des noms de champs en français.
2.  Ne rien inventer ni modifier du contenu textuel original (titre, lien, description basée sur l'original).
3.  "categorie" : Choisir parmi la liste fournie.
4.  "importance" : Calculer selon les critères.
5.  Coordonnées ("latitude", "longitude") : Précises si possible, sinon null. Pas d'extrapolation.
6.  "imageUrl": Utiliser article.imageUrl si fourni, sinon laisser chaîne vide.
7.  RÉSULTAT : Uniquement l'objet JSON. Aucun texte ou commentaire en dehors.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL_TEXT,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      top_p: 0.9,
    });

    if (!completion || !completion.choices || completion.choices.length === 0 || !completion.choices[0].message.content) {
      console.error(`No valid response content from OpenAI API for article "${article.title}". Completion:`, JSON.stringify(completion, null, 2));
      return { importance: 0.0, categorie: 'flash', localisation: 'Aucune réponse API OpenAI', latitude: null, longitude: null, titre: article.title, lien: article.link, date: article.pubDate || new Date().toISOString().split('T')[0], description: article.description || "", imageUrl: article.imageUrl || "" };
    }

    const jsonStr = completion.choices[0].message.content;
    const parsedData = JSON.parse(jsonStr) as GeminiAnalysisResult; // Type used for structure

    // Validate the parsed data structure
    if (
        typeof parsedData.titre === 'string' &&
        typeof parsedData.categorie === 'string' &&
        typeof parsedData.importance === 'number' && parsedData.importance >= 0 && parsedData.importance <= 1 &&
        typeof parsedData.lien === 'string' &&
        typeof parsedData.localisation === 'string' &&
        typeof parsedData.date === 'string' &&
        typeof parsedData.description === 'string' &&
        (parsedData.imageUrl === undefined || typeof parsedData.imageUrl === 'string') &&
        (typeof parsedData.latitude === 'number' || parsedData.latitude === null) &&
        (typeof parsedData.longitude === 'number' || parsedData.longitude === null)
    ) {
        // Ensure imageUrl has a default value if undefined from AI
        parsedData.imageUrl = parsedData.imageUrl || article.imageUrl || ""; 
        // Normalize latitude and longitude to be number or null
        parsedData.latitude = typeof parsedData.latitude === 'number' ? parsedData.latitude : null;
        parsedData.longitude = typeof parsedData.longitude === 'number' ? parsedData.longitude : null;
        return parsedData;
    } else {
        console.error(`Parsed OpenAI data (French prompt) does not match expected structure or constraints for article "${article.title}":`, parsedData);
        return { 
            importance: 0.0, categorie: 'flash', localisation: 'Données API OpenAI parsées invalides', 
            latitude: null, longitude: null, titre: article.title, lien: article.link, date: article.pubDate || new Date().toISOString().split('T')[0],
            description: article.description || "Description non disponible.", imageUrl: article.imageUrl || ""
        };
    }

  } catch (error: any) {
    console.error(`Error analyzing article "${article.title}" with OpenAI (French prompt):`, error);
    let localisationMessage = 'Erreur d\'analyse OpenAI';
    if (error?.response?.data?.error?.message) { // Axios-like error structure
        localisationMessage = error.response.data.error.message.substring(0,100);
    } else if (error?.message) {
      localisationMessage = error.message.substring(0,100);
      if (error.message.toLowerCase().includes("api key not valid") || error.message.toLowerCase().includes("incorrect api key")) localisationMessage = 'Clé API OpenAI invalide';
      else if (error.message.includes("quota")) localisationMessage = 'Quota API OpenAI dépassé';
    }
    return { 
        importance: 0.0, categorie: 'flash', localisation: localisationMessage, 
        latitude: null, longitude: null, titre: article.title, lien: article.link, date: article.pubDate || new Date().toISOString().split('T')[0],
        description: article.description || "Description non disponible.", imageUrl: article.imageUrl || ""
    };
  }
};
