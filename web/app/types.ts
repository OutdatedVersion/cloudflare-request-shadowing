export type Patch =
  | { op: 'add'; path: string; value: unknown }
  | { op: 'replace'; path: string; value: unknown }
  | { op: 'remove'; path: string };

export interface MirrorResponse {
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

export interface MirrorControlResponse extends MirrorResponse {
  request: {
    method: string;
    headers: Record<string, string>;
  };
}

export interface Mirror {
  id: string;
  created_at: string;
  divergent: boolean;
  control: MirrorControlResponse;
  shadows: MirrorResponse[];
  replays: Exclude<Mirror, 'replays'>[] | null;
}
