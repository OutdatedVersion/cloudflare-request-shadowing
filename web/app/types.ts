export interface MirrorResponse {
  url: string;
  status: number;
  duration: number;
  diff: {
    added: number;
    removed: number;
    kept: number;
    patches: [];
  };
  response: string;
}

export interface Mirror {
  id: string;
  created_at: string;
  divergent: boolean;
  control: MirrorResponse & {
    request: { method: string; headers: Record<string, string> };
  };
  shadows: MirrorResponse[];
}
