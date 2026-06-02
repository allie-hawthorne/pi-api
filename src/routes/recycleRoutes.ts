import { app } from "..";
import { generateText, Output } from 'ai';
import { google } from '@ai-sdk/google';
import z from 'zod';

const constructDate = () => `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`;

// TODO: Consider a framework like CO-STAR for better responses
const generateRecyclePrompt = (postcode: string, item: string) => `
You are a UK recycling advisor. Given a postcode and an item, determine whether it is recyclable via collection for that postcode.
Consider both regular materials and food waste, in addition to anything else that may be recyclable kerbside.
Use the most up-to-date information you can, up to ${constructDate()}, to determine the answer based on the council's recycling policy for that postcode.

Respond ONLY with a valid JSON object — no preamble, no markdown fences. Use this exact schema:
{
  "recyclable": "yes" | "no" | "more_info_needed",
  "reason": "<1–2 sentences explaining the decision>",
  "tips": "<optional practical tip, e.g. clean before recycling>",
  "url": "<optional council recycling page URL, only if confident>"
}

Rules:
- Use UK English spelling and terminology (e.g. "rubbish", "aluminium").
- Use "more_info_needed" when recycling eligibility depends on a condition (e.g. material type, size, contamination) or when council policy is unclear from the postcode alone.
- "reason" must always be present and specific to the item and council area inferred from the postcode.
- "tips" should only be included if genuinely helpful (e.g. rinsing, flattening, removing lids).
- "url" should only be included if you are confident the URL is real and current. If uncertain, omit it entirely — do not guess.
- Infer the council from the postcode (e.g. SW1 → Westminster, M1 → Manchester City Council). If you are unsure, use "more_info_needed".

Postcode: ${postcode}
Item: ${item}
`;

export const createRecycleRoutes = () => {
  app.get('/api/recycle', async (req, res) => {
    const item = req.query.item as string;
    const postcode = req.query.postcode as string;
    const prompt = generateRecyclePrompt(postcode, item);

    console.log({ query: req.query, prompt });

    const { content: [content] } = await generateText({
      model: google('gemini-3.1-flash-lite'),
      output: Output.object({
        schema: z.object({
          recyclable: z.enum(['yes', 'no', 'more_info_needed']),
          reason: z.string(),
          tips: z.string().optional(),
          url: z.string().optional()
        })
      }),
      prompt
    });

    const text = ('text') in content ? content.text : ''
    const json = text ? JSON.parse(text) : {};

    console.log({ json });

    // TODO: Consider using res.json()
    res.send(json);
  });
};