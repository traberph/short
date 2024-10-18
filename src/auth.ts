import NextAuth from "next-auth"
import Authentik from "next-auth/providers/authentik"

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [Authentik],
})