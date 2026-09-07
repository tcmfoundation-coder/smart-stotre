import NextAuth, { CredentialsSignin } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import connectDB from "./mongodb"
import { User } from "@/models"
import { checkRateLimit, resetRateLimit } from "./auth-rate-limit"
import { logActivity } from "./activity-log"
import { verifyTotpCode, findMatchingRecoveryCodeIndex } from "./mfa"
import { decryptSecret } from "./mfa-crypto"

// Distinct error codes so the login page can tell "wrong password" apart
// from "this account needs a 2FA code next" and show the right UI - see
// next-auth/react's signIn(), which surfaces this as result.code.
class TwoFactorRequiredError extends CredentialsSignin {
  code = "totp_required"
}
class InvalidTotpError extends CredentialsSignin {
  code = "totp_invalid"
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "Two-factor code", type: "text" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          console.error('Missing credentials')
          return null
        }

        // Normalize email to lowercase for consistency across browsers
        const email = (credentials.email as string).toLowerCase().trim()

        // Rate limiting based on email - covers password AND 2FA code
        // attempts, since both happen inside this same function.
        const rateLimitResult = checkRateLimit(email, 5, 15 * 60 * 1000) // 5 attempts, 15 minutes

        if (!rateLimitResult.allowed) {
          console.error('Rate limit exceeded for email:', email)
          throw new Error('Too many login attempts. Please try again later.')
        }

        try {
          await connectDB()
          const user = await User.findOne({ email: email })
            .select('+password +twoFactorSecretEncrypted +twoFactorRecoveryCodesHashed')

          if (!user || !user.isActive) {
            console.error('User not found or inactive for email:', email)
            return null
          }

          const isPasswordValid = await user.comparePassword(credentials.password as string)

          if (!isPasswordValid) {
            console.error('Invalid password for email:', email)
            return null
          }

          if (user.twoFactorEnabled) {
            const totpCode = (credentials.totpCode as string | undefined)?.trim()

            if (!totpCode) {
              // Correct password, but the login isn't complete yet - the
              // client re-submits with a code once it sees this.
              throw new TwoFactorRequiredError()
            }

            const secret = user.twoFactorSecretEncrypted ? decryptSecret(user.twoFactorSecretEncrypted) : null
            const isValidTotp = secret ? verifyTotpCode(secret, totpCode) : false

            if (!isValidTotp) {
              const recoveryCodes = user.twoFactorRecoveryCodesHashed || []
              const matchIndex = await findMatchingRecoveryCodeIndex(totpCode, recoveryCodes)

              if (matchIndex === -1) {
                console.error('Invalid 2FA code for email:', email)
                throw new InvalidTotpError()
              }

              // Recovery codes are single-use - remove the one just spent.
              recoveryCodes.splice(matchIndex, 1)
              user.twoFactorRecoveryCodesHashed = recoveryCodes
              await user.save()
            }
          }

          // Reset rate limit on successful login
          resetRateLimit(email)

          // Record last login (best-effort - don't fail the login over it)
          User.findByIdAndUpdate(user._id, { lastLogin: new Date() }).catch((err) => {
            console.error('Failed to record lastLogin:', err)
          })

          logActivity({
            action: 'USER_LOGIN',
            description: `${user.name} logged in`,
            userId: user._id.toString(),
            userName: user.name,
            userRole: user.role,
          })

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            branchId: user.branchId?.toString() || null,
          }
        } catch (error) {
          // These carry a specific code the login page depends on (see
          // above) - let them propagate instead of collapsing to a generic
          // failure below.
          if (error instanceof TwoFactorRequiredError || error instanceof InvalidTotpError) {
            throw error
          }
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.branchId = user.branchId
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.branchId = token.branchId as string | null
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  trustHost: true, // Allow all hosts to prevent browser-specific issues
  secret: process.env.NEXTAUTH_SECRET,
})
