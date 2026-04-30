import { backendRequest } from "../../../api/http";
import { appConfig } from "../../../config/app";
import type { AgentTrackSearchRequest, AgentTrackSearchResponse } from "./types";

const SEARCH_BASE_PATH = "/agent/search";

export function searchTracksWithAgent(
  input: AgentTrackSearchRequest,
  signal?: AbortSignal,
) {
  return backendRequest<AgentTrackSearchResponse>(`${SEARCH_BASE_PATH}/tracks`, {
    method: "POST",
    signal,
    body: JSON.stringify({
      query: input.query,
      model: input.model ?? appConfig.agent.searchModel,
      limit: input.limit ?? 8,
      offset: input.offset ?? 0,
      selectedPlaylistId: input.selectedPlaylistId,
      playlistIds: input.playlistIds ?? [],
      queueTrackIds: input.queueTrackIds ?? [],
      spotifyDeveloperAccount:
        input.spotifyDeveloperAccount ?? appConfig.spotify.developerAccount,
      metadata: input.metadata,
    }),
  });
}
