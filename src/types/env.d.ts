declare namespace NodeJS {
  interface ProcessEnv {
    MONGODB_URI: string;
    NEXTAUTH_SECRET: string;
    NEXTAUTH_URL: string;
    NEXT_PUBLIC_SOCKET_URL: string;
    SOCKET_PORT?: string;
    NEXT_PUBLIC_APP_URL?: string;
  }
}
