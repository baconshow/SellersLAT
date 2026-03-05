'use server';
/**
 * @fileOverview An AI assistant for project managers to interact with project data.
 *
 * - projectAIChatAssistant - A function that handles user queries about project data, provides summaries, risks, actions, and can update presentation slides.
 * - ProjectAIChatAssistantInput - The input type for the projectAIChatAssistant function.
 * - ProjectAIChatAssistantOutput - The return type for the projectAIChatAssistant function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ProjectAIChatAssistantInputSchema = z.object({
  userQuery: z.string().describe('The user\'s query or command for the AI assistant.'),
  projectData: z.object({
    projectName: z.string().describe('The name of the project.'),
    clientName: z.string().describe('The name of the client.'),
    currentPhase: z.string().describe('The current active phase of the project.'),
    startDate: z.string().datetime().describe('The start date of the project in ISO format.'),
    endDate: z.string().datetime().describe('The end date of the project in ISO format.'),
    phases: z.array(
      z.object({
        name: z.string().describe('Name of the phase.'),
        status: z.string().describe('Current status of the phase (e.g., pending, in_progress, completed, blocked).'),
        startDate: z.string().datetime().optional().describe('Start date of the phase in ISO format, if available.'),
        endDate: z.string().datetime().optional().describe('End date of the phase in ISO format, if available.'),
      })
    ).describe('An array of all project phases.'),
    weeklyUpdates: z.array(
      z.object({
        weekNumber: z.number().describe('The week number of the update.'),
        date: z.string().datetime().describe('The date of the weekly update in ISO format.'),
        distributorsTotal: z.number().describe('Total number of distributors.'),
        distributorsIntegrated: z.number().describe('Number of integrated distributors.'),
        distributorsPending: z.number().describe('Number of pending distributors.'),
        distributorsBlocked: z.number().describe('Number of blocked distributors.'),
        highlights: z.array(z.string()).describe('Key highlights for the week.'),
        blockers: z.array(z.string()).describe('Any blockers or risks identified for the week.'),
        nextSteps: z.array(z.string()).describe('Planned next steps for the week.'),
        aiSummary: z.string().optional().describe('AI-generated summary for the week, if available.'),
      })
    ).describe('An array of all weekly updates for the project, sorted by week number descending.'),
    currentPresentationContent: z.record(z.string(), z.string()).describe('Current content of various presentation slides, keyed by slide name (e.g., executive_summary, weekly_highlights).'),
  }).describe('Comprehensive data about the current project.'),
});
export type ProjectAIChatAssistantInput = z.infer<typeof ProjectAIChatAssistantInputSchema>;

const ProjectAIChatAssistantOutputSchema = z.object({
  aiResponse: z.string().describe('The AI\'s textual response to the user query.'),
  toolOutput: z.any().optional().describe('The output from any tool calls made by the AI.'),
});
export type ProjectAIChatAssistantOutput = z.infer<typeof ProjectAIChatAssistantOutputSchema>;

// Define a tool for updating presentation slide content
const updatePresentationSlideContent = ai.defineTool(
  {
    name: 'updatePresentationSlideContent',
    description: 'Updates content for a specific section of a project presentation slide.',
    inputSchema: z.object({
      slideName: z.enum(['executive_summary', 'integrations_status_summary', 'weekly_highlights', 'blockers_risks', 'next_steps'])
        .describe('The name of the presentation slide section to update. Available options: executive_summary, integrations_status_summary, weekly_highlights, blockers_risks, next_steps.'),
      newContent: z.string().describe('The new content to set for the specified slide section.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
      updatedSlide: z.string().optional(),
      updatedContent: z.string().optional(),
    }),
  },
  async (input) => {
    // In a real application, this would interact with a database or service
    // to actually update the presentation content. For this flow, we'll simulate it.
    console.log(`Tool Call: Updating slide '${input.slideName}' with content: '${input.newContent}'`);
    return {
      success: true,
      message: `Content for '${input.slideName}' successfully updated.`, 
      updatedSlide: input.slideName,
      updatedContent: input.newContent,
    };
  }
);

const projectAIChatAssistantPrompt = ai.definePrompt({
  name: 'projectAIChatAssistantPrompt',
  input: { schema: ProjectAIChatAssistantInputSchema },
  output: { schema: ProjectAIChatAssistantOutputSchema },
  tools: [updatePresentationSlideContent],
  prompt: `You are an intelligent AI assistant specialized in project management for Sellers Pulse, a project deployment platform. Your role is to assist project managers by analyzing project data, providing insights, and facilitating updates to presentation slides.

Your capabilities include:
- Providing executive summaries of project status.
- Identifying potential risks and blockers.
- Suggesting strategic actions and next steps.
- Updating specific content sections within presentation slides using the 'updatePresentationSlideContent' tool.

When asked to update slide content, you MUST use the 'updatePresentationSlideContent' tool with the appropriate 'slideName' and 'newContent'. The available slide names for update are: executive_summary, integrations_status_summary, weekly_highlights, blockers_risks, next_steps. If a user asks for something outside of these, respond that you can only update these specific sections.

Project Context:
Project Name: {{{projectData.projectName}}} (Client: {{{projectData.clientName}}})
Current Phase: {{{projectData.currentPhase}}}
Project Duration: From {{{projectData.startDate}}} to {{{projectData.endDate}}}

Project Phases:
{{#each projectData.phases}} - {{this.name}} (Status: {{this.status}}){{#if this.startDate}} from {{this.startDate}}{{/if}}{{#if this.endDate}} to {{this.endDate}}{{/if}}
{{/each}}

Latest Weekly Update:
{{#if projectData.weeklyUpdates.0}}
Week: {{projectData.weeklyUpdates.0.weekNumber}} (Date: {{projectData.weeklyUpdates.0.date}})
Distributors: Total={{projectData.weeklyUpdates.0.distributorsTotal}}, Integrated={{projectData.weeklyUpdates.0.distributorsIntegrated}}, Pending={{projectData.weeklyUpdates.0.distributorsPending}}, Blocked={{projectData.weeklyUpdates.0.distributorsBlocked}}
Highlights:
{{#each projectData.weeklyUpdates.0.highlights}} - {{{this}}}
{{/each}}
Blockers:
{{#each projectData.weeklyUpdates.0.blockers}} - {{{this}}}
{{/each}}
Next Steps:
{{#each projectData.weeklyUpdates.0.nextSteps}} - {{{this}}}
{{/each}}
AI Summary: {{{projectData.weeklyUpdates.0.aiSummary}}}
{{else}} No weekly updates available.
{{/if}}

Current Presentation Content (for your reference, not to be directly output unless asked):
{{{json projectData.currentPresentationContent}}}

User Query: {{{userQuery}}}

Respond thoughtfully, providing clear answers, suggestions, or using the tool as requested.`,
});

const projectAIChatAssistantFlow = ai.defineFlow(
  {
    name: 'projectAIChatAssistantFlow',
    inputSchema: ProjectAIChatAssistantInputSchema,
    outputSchema: ProjectAIChatAssistantOutputSchema,
  },
  async (input) => {
    const response = await projectAIChatAssistantPrompt(input);

    const aiResponseText = response.text || '';
    const toolOutputs = response.toolOutputs;

    if (toolOutputs && toolOutputs.length > 0) {
      // Assuming only one tool call per turn for simplicity
      return {
        aiResponse: aiResponseText,
        toolOutput: toolOutputs[0].result, // Return the result of the first tool call
      };
    } else {
      return {
        aiResponse: aiResponseText,
      };
    }
  }
);

export async function projectAIChatAssistant(input: ProjectAIChatAssistantInput): Promise<ProjectAIChatAssistantOutput> {
  return projectAIChatAssistantFlow(input);
}
