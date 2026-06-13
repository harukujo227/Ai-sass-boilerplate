import type { DefaultSession } from "next-auth";

// Augment NextAuth's types with the custom fields this app stores on users.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      credits: number;
    } & DefaultSession["user"];
  }

  interface User {
    credits: number;
  }
}

declare module "next-auth/adapters" {
  interface AdapterUser {
    credits: number;
  }
}
