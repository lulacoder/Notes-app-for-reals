import { AccountSettings } from "@/components/auth/AccountSettings";
import { getReturnPath } from "@/lib/auth-redirects";

export default async function AccountPage({ searchParams }: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  return <AccountSettings
    returnTo={getReturnPath(params.next)}
    connectGoogle={params.connect === "google"}
    oauthError={typeof params.error === "string" ? params.error : undefined}
  />;
}
