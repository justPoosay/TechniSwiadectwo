// Type helpers that read request/response shapes from the generated OpenAPI types
// (schema.ts). Nothing here exists at runtime.
import type { components, paths } from "./schema";

/** Every schema component, e.g. `ApiSchema["User"]`. */
export type ApiSchema = components["schemas"];

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

/** API paths that support the given method, e.g. `PathsWith<"post">`. */
export type PathsWith<M extends HttpMethod> = {
  [P in keyof paths]: paths[P][M] extends undefined ? never : P;
}[keyof paths];

export type Operation<P extends keyof paths, M extends HttpMethod> = NonNullable<paths[P][M]>;

type JsonContent<R> = R extends { content: { "application/json": infer C } } ? C : undefined;
type SuccessStatus = 200 | 201 | 202 | 204;
type Parameters<O> = O extends { parameters: infer P } ? P : never;
type Param<O, K extends string> = NonNullable<
  Parameters<O> extends { [key in K]?: infer X } ? X : never
>;
type IsNever<T> = [T] extends [never] ? true : false;

/** Body of the successful response (undefined for 204). */
export type ResponseData<O> = O extends { responses: infer R }
  ? JsonContent<R[Extract<keyof R, SuccessStatus>]>
  : never;

export type RequestBody<O> = O extends { requestBody?: infer B }
  ? JsonContent<NonNullable<B>>
  : never;

type PathOption<O> =
  IsNever<Param<O, "path">> extends true ? { path?: never } : { path: Param<O, "path"> };

type QueryOption<O> =
  IsNever<Param<O, "query">> extends true
    ? { query?: never }
    : Parameters<O> extends { query: object }
      ? { query: Param<O, "query"> }
      : { query?: Param<O, "query"> };

type SchoolOption<O> =
  IsNever<Param<O, "header">> extends true
    ? { schoolId?: string }
    : Param<O, "header"> extends { "X-School-ID": string }
      ? { schoolId: string }
      : { schoolId?: string };

type BodyOption<O> =
  IsNever<RequestBody<O>> extends true
    ? { body?: never }
    : O extends { requestBody: object }
      ? { body: RequestBody<O> }
      : { body?: RequestBody<O> };

export type CallOptions<O> = {
  signal?: AbortSignal;
  headers?: HeadersInit;
} & PathOption<O> &
  QueryOption<O> &
  SchoolOption<O> &
  BodyOption<O>;

/** Options become a required argument only when the operation has required fields. */
export type CallArgs<O> =
  object extends CallOptions<O> ? [options?: CallOptions<O>] : [options: CallOptions<O>];
