
'use server';
/**
 * @fileOverview An AI flow for generating playlists based on listening history.
 *
 * - generatePlaylist - A function that creates a playlist from a user's library based on their listening history.
 * - PlaylistInput - The input type for the generatePlaylist function.
 * - PlaylistOutput - The return type for the generatePlaylist function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the schema for a single song
const SongSchema = z.object({
  id: z.string(),
  title: z.string(),
  artist: z.string(),
  album: z.string(),
});

// Define the input schema for the playlist generation flow
const PlaylistInputSchema = z.object({
  history: z.array(SongSchema).describe("The user's listening history."),
  library: z.array(SongSchema).describe("The user's entire music library."),
});
export type PlaylistInput = z.infer<typeof PlaylistInputSchema>;

// Define the output schema for the playlist generation flow
const PlaylistOutputSchema = z.object({
  playlist: z.array(z.string()).describe('An array of song IDs for the generated playlist.'),
});
export type PlaylistOutput = z.infer<typeof PlaylistOutputSchema>;

// The main exported function that clients will call
export async function generatePlaylist(input: PlaylistInput): Promise<PlaylistOutput> {
  return playlistFlow(input);
}

// Define the Genkit prompt
const playlistPrompt = ai.definePrompt({
  name: 'playlistPrompt',
  input: {schema: PlaylistInputSchema},
  output: {schema: PlaylistOutputSchema},
  prompt: `
    You are an expert DJ who creates amazing playlists.
    Analyze the user's listening history to understand their musical taste.
    The history is provided in a chronological order, with the most recently played songs appearing last.
    
    Your task is to create a new playlist of 15-20 songs from the user's library that matches the style and mood of their recent listening history.
    Do not include songs that are already in the listening history.
    Return the playlist as an array of song IDs.

    User's Listening History:
    {{#each history}}
    - "{{title}}" by {{artist}} (Album: {{album}})
    {{/each}}

    Available songs in the User's Library:
    {{#each library}}
    - (ID: {{id}}) "{{title}}" by {{artist}} (Album: {{album}})
    {{/each}}
  `,
});

// Define the Genkit flow
const playlistFlow = ai.defineFlow(
  {
    name: 'playlistFlow',
    inputSchema: PlaylistInputSchema,
    outputSchema: PlaylistOutputSchema,
  },
  async (input) => {
    // To prevent errors with very large libraries, we'll select a random sample of songs
    // if the library is larger than a certain size. This helps keep the prompt manageable.
    const MAX_LIBRARY_SIZE_FOR_PROMPT = 200;
    let librarySample = input.library;
    if (librarySample.length > MAX_LIBRARY_SIZE_FOR_PROMPT) {
        librarySample.sort(() => 0.5 - Math.random());
        librarySample = librarySample.slice(0, MAX_LIBRARY_SIZE_FOR_PROMPT);
    }
    
    const { output } = await playlistPrompt({
        ...input,
        library: librarySample
    });

    return output || { playlist: [] };
  }
);
