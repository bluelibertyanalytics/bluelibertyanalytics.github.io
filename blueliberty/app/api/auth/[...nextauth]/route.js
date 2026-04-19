import NextAuth from "next-auth";
import CognitoProvider from "next-auth/providers/cognito";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60,
  },
  providers: [
    CognitoProvider({
      clientId: process.env.COGNITO_CLIENT_ID,
      clientSecret: process.env.COGNITO_CLIENT_SECRET,
      issuer: process.env.COGNITO_ISSUER,
      authorization: {
        params: {
          prompt: "login",
          scope: "openid email profile",
          response_type: "code",
        },
      },
      checks: ["pkce", "state"],
      client: {
        token_endpoint_auth_method: "client_secret_post",
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const command = new GetItemCommand({
        TableName: "AllowedUsers",
        Key: { email: { S: user.email } },
      });

      try {
        const result = await client.send(command);
        console.log("DynamoDB result:", JSON.stringify(result, null, 2));

        if (!result.Item) return false;

        user.role = result.Item.role?.S || "client";
        user.firstName = result.Item.firstName?.S || user.name?.split(" ")[0] || "";
        user.orgName = result.Item.orgName?.S || null;

        // ✅ Read orgIds as a DynamoDB StringSet (SS)
        // Falls back to wrapping legacy single orgId in an array
        const rawOrgIds = result.Item.orgIds?.SS
          || (result.Item.orgId?.S ? [result.Item.orgId.S] : []);

        const orgNamesMap = result.Item.orgNames?.M || {};
        user.orgIds = rawOrgIds.map((id) => ({
            id,
            name: orgNamesMap[id]?.S || id  // friendly name, falls back to id if missing
        }));
        user.orgId = rawOrgIds[0] || null; // default active org

        return true;
      } catch (err) {
        console.error("DynamoDB error:", err);
        return false;
      }
    },

    async jwt({ token, user }) {
      if (user) {
        token.role = user.role || "client";
        token.firstName = user.firstName || "";
        token.orgIds = user.orgIds || [];          // ✅ array of {id, name}
        token.orgId = user.orgId || null;           // default/active org
        token.orgName = user.orgName || null;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.role = token.role;
        session.user.firstName = token.firstName;
        session.user.orgIds = token.orgIds || [];   // ✅ full list for switcher
        session.user.orgId = token.orgId || null;   // default active org
        session.user.orgName = token.orgName || null;
      }
      return session;
    },

    async redirect({ baseUrl, token }) {
      if (token?.role === "admin") return `${baseUrl}/admin`;
      if (token?.role === "client") return `${baseUrl}/client`;
      return baseUrl;
    },
  },
  events: {
    async signOut({ token, session }) {
      console.log("User signed out, clearing state");
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };