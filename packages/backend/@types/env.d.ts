declare namespace NodeJS {
  interface ProcessEnv {
    BETTER_AUTH_URL?: string;
    CLIENT_ORIGIN?: string;
    DATABASE_URL?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    GOOGLE_GENERATIVE_AI_API_KEY?: string;
    NODE_ENV?: string;
    PORT?: string;
    SYSTEM_PROMPT?: string;
  }
}
