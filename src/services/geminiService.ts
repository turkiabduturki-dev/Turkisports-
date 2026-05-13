import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function getFootballAssistant(prompt: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: `أنت مساعد رياضي متخصص في كرة القدم. اسمك "مدرب ذكي". 
        توفر تحليلات دقيقة، توقعات للمباريات، ومعلومات تاريخية عن اللاعبين والأندية. 
        تحدث باللغة العربية بأسلوب مشوق واحترافي. 
        استخدم أداة البحث للحصول على نتائج حية وأخبار حقيقية إذا سُئلت عن أحداث جارية.`,
        tools: [{ googleSearch: {} }]
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "عذراً، واجهت مشكلة في الاتصال بمدرب الذكاء الاصطناعي.";
  }
}

export async function fetchLiveNews() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "ما هي أحدث 5 أخبار مهمة في كرة القدم العالمية اليوم؟ قدمها بتنسيق JSON يحتوي على (id, العنوان، ملخص، المصدر، التاريخ). تأكد من أن كل خبر له id فريد.",
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }]
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("News Fetch Error:", error);
    return [];
  }
}
