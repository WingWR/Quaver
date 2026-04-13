import { backendRequest } from "../../../api/http";
import type {
  LibraryBootstrapResponse,
  LibraryMutationResponse,
  PlaylistTrackMutationRequest,
  QueueMutationRequest,
} from "./types";

const LIBRARY_BASE_PATH = "/library";

export function fetchLibraryBootstrap(signal?: AbortSignal) {
  return backendRequest<LibraryBootstrapResponse>(`${LIBRARY_BASE_PATH}/bootstrap`, { signal });
}

export function insertTrackNextInBackendQueue(payload: QueueMutationRequest) {
  return backendRequest<LibraryMutationResponse>(`${LIBRARY_BASE_PATH}/queue/next`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function appendTrackToBackendQueue(payload: QueueMutationRequest) {
  return backendRequest<LibraryMutationResponse>(`${LIBRARY_BASE_PATH}/queue`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function addTrackToBackendPlaylist(
  playlistId: string,
  payload: PlaylistTrackMutationRequest,
) {
  return backendRequest<LibraryMutationResponse>(`${LIBRARY_BASE_PATH}/playlists/${playlistId}/tracks`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
