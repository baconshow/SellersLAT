'use server';
/**
 * @fileOverview A Genkit flow for generating a concise weekly summary of project updates.
 *
 * - generateWeeklySummary - A function that handles the AI summary generation process.
 * - GenerateWeeklySummaryInput - The input type for the generateWeeklySummary function.
 * - GenerateWeeklySummaryOutput - The return type for the generateWeeklySummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateWeeklySummaryInputSchema = z.object({
  weekNumber: z.number().describe('The current week number of the project.'),
  highlights: z
    .array(z.string())
    .describe('A list of key achievements and positive developments for the week.'),
  blockers: z
    .array(z.string())
    .describe('A list of obstacles, risks, or issues encountered during the week.'),
  nextSteps: z
    .array(z.string())
    .describe('A list of planned actions and objectives for the upcoming week.'),
});
export type GenerateWeeklySummaryInput = z.infer<typeof GenerateWeeklySummaryInputSchema>;

const GenerateWeeklySummaryOutputSchema = z.object({
  aiSummary: z
    .string()
    .describe(
      'A concise, professional, and action-oriented summary of the weekly project update, synthesizing highlights, blockers, and next steps.'
    ),
});
export type GenerateWeeklySummaryOutput = z.infer<typeof GenerateWeeklySummaryOutputSchema>;

export async function generateWeeklySummary(
  input: GenerateWeeklySummaryInput
): Promise<GenerateWeeklySummaryOutput> {
  return generateWeeklySummaryFlow(input);
}

const generateWeeklySummaryPrompt = ai.definePrompt({
  name: 'generateWeeklySummaryPrompt',
  input: {schema: GenerateWeeklySummaryInputSchema},
  output: {schema: GenerateWeeklySummaryOutputSchema},
  prompt: `You are an AI assistant acting as an expert project manager. Your task is to synthesize the provided weekly project update data into a concise, professional, and action-oriented summary.

The summary should highlight key achievements, clearly state any blockers or risks, and outline the concrete next steps for the upcoming week. Focus on clarity, brevity, and actionable insights.

Project Week Number: {{{weekNumber}}}

Highlights:
{{#if highlights}}
{{#each highlights}}- {{{this}}}
{{/each}}
{{else}}No significant highlights reported.
{{/if}}

Blockers/Risks:
{{#if blockers}}
{{#each blockers}}- {{{this}}}
{{/each}}
{{else}}No significant blockers or risks reported.
{{/if}}

Next Steps:
{{#if nextSteps}}
{{#each nextSteps}}- {{{this}}}
{{/each}}
{{else}}No specific next steps outlined.
{{/if}}

Provide the summary in the 'aiSummary' field.`,
});

const generateWeeklySummaryFlow = ai.defineFlow(
  {
    name: 'generateWeeklySummaryFlow',
    inputSchema: GenerateWeeklySummaryInputSchema,
    outputSchema: GenerateWeeklySummaryOutputSchema,
  },
  async input => {
    const {output} = await generateWeeklySummaryPrompt(input);
    return output!;
  }
);
