"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "./errors";

export type Fetcher<T> = (signal: AbortSignal) => Promise<T>;

type QueryState<T> = {
  source: Fetcher<T> | null;
  token: number;
  data: T | undefined;
  error: ApiError | null;
};

export type ApiQuery<T> = {
  /** Data for the current fetcher, undefined while it loads. */
  data: T | undefined;
  /** Last successful data, possibly from previous parameters (e.g. the previous page). */
  previousData: T | undefined;
  error: ApiError | null;
  isLoading: boolean;
  reload: () => void;
};

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError(0, "Wystąpił nieoczekiwany błąd.", "error");
}

/**
 * Runs `fetcher` whenever it changes (wrap it in useCallback with its parameters
 * as dependencies). Requests that are no longer needed are aborted, so a slow
 * response for old filters never overwrites newer results.
 */
export function useApiQuery<T>(fetcher: Fetcher<T> | null): ApiQuery<T> {
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<QueryState<T>>({
    source: null,
    token: 0,
    data: undefined,
    error: null,
  });

  useEffect(() => {
    if (!fetcher) return;
    const controller = new AbortController();
    fetcher(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) {
          setState({ source: fetcher, token: reloadToken, data, error: null });
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setState((prev) => ({
            source: fetcher,
            token: reloadToken,
            data: prev.data,
            error: toApiError(error),
          }));
        }
      }
    );
    return () => controller.abort();
  }, [fetcher, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  const isCurrent = fetcher !== null && state.source === fetcher && state.token === reloadToken;
  return {
    data: isCurrent && !state.error ? state.data : undefined,
    previousData: state.data,
    error: isCurrent ? state.error : null,
    isLoading: fetcher !== null && !isCurrent,
    reload,
  };
}
