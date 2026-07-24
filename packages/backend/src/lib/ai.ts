import type { LanguageModel } from 'ai';

import { google } from '@ai-sdk/google';
import { createOllama } from 'ai-sdk-ollama';

import { env } from '../config/env.js';

function resolveLanguageModel(): LanguageModel {
  if (env.LLM_PROVIDER === 'ollama') {
    const ollama = createOllama({ baseURL: env.OLLAMA_BASE_URL });

    return ollama(env.LLM_MODEL);
  }

  return google(env.LLM_MODEL);
}

export const languageModel = resolveLanguageModel();
