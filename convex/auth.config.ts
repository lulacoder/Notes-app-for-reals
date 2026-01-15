import type { AuthConfig } from "convex/server";
import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";

const authConfig: AuthConfig = {
  providers: [getAuthConfigProvider()],
};

export default authConfig;
