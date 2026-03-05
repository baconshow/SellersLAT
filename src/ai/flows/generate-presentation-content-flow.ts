'use server';
/**
 * @fileOverview A Genkit flow for generating dynamic presentation slide content for the Sellers Pulse platform.
 *
 * - generatePresentationContent - A function that generates dynamic text content for presentation slides.
 * - GeneratePresentationContentInput - The input type for the generatePresentationContent function.
 * - GeneratePresentationContentOutput - The return type for the generatePresentationContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const WeeklyUpdateSchema = z.object({
  weekNumber: z.number().describe('The week number of the update.'),
  date: z.string().describe('The date of the weekly update in "YYYY-MM-DD" format.'),
  distributorsTotal: z.number().describe('Total number of distributors.'),
  distributorsIntegrated: z.number().describe('Number of distributors integrated.'),
  distributorsPending: z.number().describe('Number of distributors pending integration.'),
  distributorsBlocked: z.number().describe('Number of distributors blocked from integration.'),
  highlights: z.array(z.string()).describe('Key achievements and positive updates for the week.'),
  blockers: z.array(z.string()).describe('Challenges and impediments encountered.'),
  nextSteps: z.array(z.string()).describe('Planned actions for the upcoming week.'),
  aiSummary: z.string().optional().describe('AI-generated summary of the week, if available.'),
});

const PhaseSchema = z.object({
  id: z.string().describe('The unique identifier for the phase.'),
  name: z.string().describe('The name of the project phase.'),
  order: z.number().describe('The display order of the phase.'),
  startDate: z.string().describe('The start date of the phase in "YYYY-MM-DD" format.'),
  endDate: z.string().describe('The end date of the phase in "YYYY-MM-DD" format.'),
  status: z.enum(['pending', 'in_progress', 'completed', 'blocked']).describe('The current status of the phase.'),
  color: z.string().describe('The primary color associated with the client for this phase.'),
});

const GeneratePresentationContentInputSchema = z.object({
  clientName: z.string().describe('The name of the client for the project.'),
  currentPhase: z.string().describe('The name of the currently active project phase.'),
  startDate: z.string().describe('The project start date in "YYYY-MM-DD" format.'),
  endDate: z.string().describe('The project end date in "YYYY-MM-DD" format.'),
  weeklyUpdates: z.array(WeeklyUpdateSchema).describe('A list of all weekly updates for the project, ordered from oldest to newest.'),
  phases: z.array(PhaseSchema).describe('A list of all project phases, ordered by their `order` property.'),
});
export type GeneratePresentationContentInput = z.infer<typeof GeneratePresentationContentInputSchema>;

const GeneratePresentationContentOutputSchema = z.object({
  executiveSummary: z.string().describe('A concise executive summary of the project status, key achievements, and overall trajectory.'),
  statusOfIntegrations: z.string().describe('A summary of distributor integration progress, including total, integrated, pending, and blocked numbers.'),
  currentPhaseSummary: z.string().describe('A description of the current project phase, its status, and key objectives.'),
  weeklyHighlights: z.array(z.string()).describe('A bulleted list of the most important highlights from the latest weekly update.'),
  weeklyBlockers: z.array(z.string()).describe('A bulleted list of the most critical blockers and risks from the latest weekly update.'),
  weeklyNextSteps: z.array(z.string()).describe('A bulleted list of the immediate next steps and action plans from the latest weekly update.'),
  overallSentiment: z.enum(['positive', 'neutral', 'negative']).describe('The overall sentiment regarding the project status based on the provided data.'),
});
export type GeneratePresentationContentOutput = z.infer<typeof GeneratePresentationContentOutputSchema>;

// Helper function to get the latest weekly update (assuming updates are ordered oldest to newest)
function getLatestWeeklyUpdate(updates: z.infer<typeof WeeklyUpdateSchema>[]): z.infer<typeof WeeklyUpdateSchema> | undefined {
  if (updates.length === 0) return undefined;
  return updates[updates.length - 1]; // Last item is the latest
}

// Internal schema for the prompt, which includes pre-processed data for clarity
const PromptInputSchema = z.object({
  clientName: z.string(),
  currentPhase: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  phases: z.array(PhaseSchema),
  allWeeklyUpdates: z.array(WeeklyUpdateSchema).describe('All weekly updates, ordered oldest to newest.'),
  latestWeeklyUpdate: WeeklyUpdateSchema.optional().describe('The most recent weekly update.'),
});
type PromptInput = z.infer<typeof PromptInputSchema>;

const generatePresentationContentPrompt = ai.definePrompt({
  name: 'generatePresentationContentPrompt',
  input: {schema: PromptInputSchema},
  output: {schema: GeneratePresentationContentOutputSchema},
  prompt: `You are an expert project manager and presentation content generator for "Sellers Pulse", a project management platform.
Your task is to analyze the provided project data for a client, identify key information, and generate compelling, concise, and professional text content suitable for a client presentation slide deck.
Focus on providing clear summaries, highlighting achievements, detailing challenges, and outlining future actions.

The output should be a JSON object conforming to the GeneratePresentationContentOutputSchema.
Ensure the tone is confident, professional, and client-facing.

Here is the project data:

Client Name: {{{clientName}}}
Project Start Date: {{{startDate}}}
Project End Date: {{{endDate}}}
Current Project Phase: {{{currentPhase}}}

Project Phases:
{{#each phases}}
- Name: {{{this.name}}}, Status: {{{this.status}}}, Start: {{{this.startDate}}}, End: {{{this.endDate}}}
{{/each}}

All Weekly Updates (oldest to newest):
{{#if allWeeklyUpdates}}
  {{#each allWeeklyUpdates}}
    --- Week {{this.weekNumber}} ({{{this.date}}}) ---
    Distributors: Total={{this.distributorsTotal}}, Integrated={{this.distributorsIntegrated}}, Pending={{this.distributorsPending}}, Blocked={{this.distributorsBlocked}}
    Highlights: {{#each this.highlights}}- {{{this}}}{{/each}}
    Blockers: {{#each this.blockers}}- {{{this}}}{{/each}}
    Next Steps: {{#each this.nextSteps}}- {{{this}}}{{/each}}
    {{#if this.aiSummary}}AI Summary: {{{this.aiSummary}}}{{/if}}
  {{/each}}
{{else}}
No weekly updates available yet.
{{/if}}

{{#if latestWeeklyUpdate}}
The latest weekly update is for Week {{{latestWeeklyUpdate.weekNumber}}} ({{{latestWeeklyUpdate.date}}}).
It reports:
Distributors: Total={{latestWeeklyUpdate.distributorsTotal}}, Integrated={{latestWeeklyUpdate.distributorsIntegrated}}, Pending={{latestWeeklyUpdate.distributorsPending}}, Blocked={{latestWeeklyUpdate.distributorsBlocked}}
Highlights: {{#each latestWeeklyUpdate.highlights}}- {{{this}}}{{/each}}
Blockers: {{#each latestWeeklyUpdate.blockers}}- {{{this}}}{{/each}}
Next Steps: {{#each latestWeeklyUpdate.nextSteps}}- {{{this}}}{{/each}}
{{/if}}

Based on this data, generate the presentation content:
`,
});

const generatePresentationContentFlow = ai.defineFlow(
  {
    name: 'generatePresentationContentFlow',
    inputSchema: GeneratePresentationContentInputSchema,
    outputSchema: GeneratePresentationContentOutputSchema,
  },
  async (input) => {
    const latestWeeklyUpdateData = getLatestWeeklyUpdate(input.weeklyUpdates);

    const promptInput: PromptInput = {
      clientName: input.clientName,
      currentPhase: input.currentPhase,
      startDate: input.startDate,
      endDate: input.endDate,
      phases: input.phases,
      allWeeklyUpdates: input.weeklyUpdates,
      latestWeeklyUpdate: latestWeeklyUpdateData,
    };

    const {output} = await generatePresentationContentPrompt(promptInput);
    return output!;
  }
);

export async function generatePresentationContent(
  input: GeneratePresentationContentInput
): Promise<GeneratePresentationContentOutput> {
  return generatePresentationContentFlow(input);
}
