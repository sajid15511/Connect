declare namespace NodeJS {
  interface ProcessEnv {
    MONGODB_URI: string;
    AUTH_SECRET: string;
    AUTH_URL: string;
    NEXTAUTH_SECRET: string;
    NEXTAUTH_URL: string;
    NEXT_PUBLIC_SOCKET_URL: string;
    SOCKET_PORT?: string;
    NEXT_PUBLIC_APP_URL?: string;
    R2_ENDPOINT: string;
    R2_ACCESS_KEY_ID: string;
    R2_SECRET_ACCESS_KEY: string;
    R2_BUCKET_NAME: string;
  }
}
