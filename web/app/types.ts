export type Patch =
  | { op: 'add'; path: string; value: unknown }
  | { op: 'replace'; path: string; value: unknown }
  | { op: 'remove'; path: string };

export interface ShadowResponse {
  url: string;
  status: number;
  duration: number;
  // TODO: migration to backfill these?
  startedAt?: number;
  endedAt?: number;
  diff: {
    added: number;
    removed: number;
    kept: number;
    patches: Patch[];
  };
  headers: Record<string, string>;
  response: string;
}

export interface ShadowControlResponse extends ShadowResponse {
  request: {
    method: string;
    headers: Record<string, string>;
  };
}

export interface Shadow {
  id: string;
  created_at: string;
  divergent: boolean;
  control: ShadowControlResponse;
  shadows: ShadowResponse[];
  replays: Exclude<Shadow, 'replays'>[] | null;
  tags: Record<string, string> | null;
}
