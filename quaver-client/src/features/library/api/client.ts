import { backendRequest } from "../../../api/http";
import type {
  LibraryBootstrapResponse,
  LibraryMutationResponse,
  PlaybackStartRequest,
  PlaybackStateUpdateRequest,
  PlaylistCreateRequest,
  PlaylistTrackMutationRequest,
  PlaylistUpdateRequest,
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

export function createBackendPlaylist(payload: PlaylistCreateRequest) {
  return backendRequest<LibraryMutationResponse>(`${LIBRARY_BASE_PATH}/playlists`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateBackendPlaylist(
  playlistId: string,
  payload: PlaylistUpdateRequest,
) {
  return backendRequest<LibraryMutationResponse>(`${LIBRARY_BASE_PATH}/playlists/${playlistId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteBackendPlaylist(playlistId: string) {
  return backendRequest<LibraryMutationResponse>(`${LIBRARY_BASE_PATH}/playlists/${playlistId}`, {
    method: "DELETE",
  });
}

export function startBackendPlayback(payload: PlaybackStartRequest) {
  return backendRequest<LibraryMutationResponse>(`${LIBRARY_BASE_PATH}/playback/start`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateBackendPlaybackState(payload: PlaybackStateUpdateRequest) {
  return backendRequest<LibraryMutationResponse>(`${LIBRARY_BASE_PATH}/playback/state`, {
    method: "PATCH",
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
