/**
 * The problem of a job (posted for bids or booked directly) can be told in writing or in a voice note: either one is enough to move on, neither is needed in
 * addition to the other, and photos are always optional.
 */
export const VOICE_ONLY_TEXT = '🎤 හඬ සටහනෙන් විස්තර කළා';

/** Whether the problem has been told: some text (at least `minChars`) or at least one voice note. */
export const problemTold = (description: string, voiceNotes: readonly unknown[], minChars = 1) => description.trim().length >= minChars || voiceNotes.length > 0;

/** The text to send with the job: what was written, or a line saying the problem is in the voice note. */
export const jobDescription = (description: string) => description.trim() || VOICE_ONLY_TEXT;
