export {};

declare global {
  interface Document {
    modelContext?: {
      registerTool: (tool: {
        name: string;
        title?: string;
        description: string;
        inputSchema: Record<string, unknown>;
        annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
        execute: (input: Record<string, unknown>, options?: { signal: AbortSignal }) => unknown | Promise<unknown>;
      }, options?: { signal?: AbortSignal }) => Promise<void>;
    };
  }
}
