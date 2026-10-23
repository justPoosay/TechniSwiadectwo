import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { ApiError } from "../errors";
import { useApiQuery, type Fetcher } from "../use-api-query";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useApiQuery", () => {
  test("loads data", async () => {
    const fetcher: Fetcher<string> = vi.fn(async () => "dane");

    const { result } = renderHook(() => useApiQuery(fetcher));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.data).toBe("dane"));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test("does nothing without a fetcher", () => {
    const { result } = renderHook(() => useApiQuery<string>(null));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  test("exposes ApiError and retries on reload", async () => {
    const fetcher = vi
      .fn<Fetcher<string>>()
      .mockRejectedValueOnce(new ApiError(500, "Błąd serwera", "server_error"))
      .mockResolvedValueOnce("po ponowieniu");

    const { result } = renderHook(() => useApiQuery(fetcher));

    await waitFor(() => expect(result.current.error?.code).toBe("server_error"));
    act(() => result.current.reload());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.data).toBe("po ponowieniu"));
    expect(result.current.error).toBeNull();
  });

  test("aborts the previous request and ignores its late response", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const signals: AbortSignal[] = [];
    const fetchFirst: Fetcher<string> = (signal) => {
      signals.push(signal);
      return first.promise;
    };
    const fetchSecond: Fetcher<string> = (signal) => {
      signals.push(signal);
      return second.promise;
    };

    const { result, rerender } = renderHook(({ fetcher }) => useApiQuery(fetcher), {
      initialProps: { fetcher: fetchFirst },
    });
    rerender({ fetcher: fetchSecond });

    expect(signals[0].aborted).toBe(true);
    await act(async () => {
      second.resolve("strona 2");
      first.resolve("strona 1 (spóźniona)");
    });

    expect(result.current.data).toBe("strona 2");
  });

  test("keeps previous data while the next parameters load", async () => {
    const next = deferred<string>();
    const { result, rerender } = renderHook(({ fetcher }) => useApiQuery(fetcher), {
      initialProps: { fetcher: (async () => "strona 1") as Fetcher<string> },
    });
    await waitFor(() => expect(result.current.data).toBe("strona 1"));

    rerender({ fetcher: () => next.promise });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.previousData).toBe("strona 1");
  });
});
