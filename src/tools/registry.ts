/**
 * The campfire tools. Only the tuner is built.
 * To add the next one: make a folder under src/tools, render it from App,
 * and set enabled to true. The tab stops saying "soon" on its own.
 */

export type ToolId = 'tuner' | 'metronome' | 'chords' | 'songs';

export type Tool = {
  id: ToolId;
  label: string;
  enabled: boolean;
};

export const tools: readonly Tool[] = [
  { id: 'tuner', label: 'tuner', enabled: true },
  { id: 'metronome', label: 'metronome', enabled: false },
  { id: 'chords', label: 'chords', enabled: false },
  { id: 'songs', label: 'songs', enabled: false },
];
