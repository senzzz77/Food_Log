import type { BodyProfile, Profile } from "@/types/domain";
import { apiRequest } from "@/services/api-client";

export function listProfiles(token: string) {
  return apiRequest<{ profiles: Profile[] }>("/profiles", {}, token);
}

export function createProfile(token: string, data: Pick<Profile, "displayName" | "accent">) {
  return apiRequest<{ profile: Profile }>("/profiles", { method: "POST", body: JSON.stringify(data) }, token);
}

export function loadBodyProfile(token: string, profileId: string) {
  return apiRequest<{ body: BodyProfile | null }>(`/profiles/${profileId}/body`, {}, token);
}

export function saveBodyProfile(token: string, profileId: string, body: Omit<BodyProfile, "profileId" | "userId" | "updatedAt">) {
  return apiRequest<{ body: Omit<BodyProfile, "profileId" | "userId" | "updatedAt"> }>(
    `/profiles/${profileId}/body`,
    { method: "PUT", body: JSON.stringify(body) },
    token,
  );
}
