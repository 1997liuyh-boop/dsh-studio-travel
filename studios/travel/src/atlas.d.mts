import type { IncomingMessage, ServerResponse } from 'node:http'
export const atlasPrefix: string
export function resolveAtlasRoot(environment?: NodeJS.ProcessEnv): string
export function createAtlas(privateRoot: string): Promise<{
  data(): Promise<object>
  handle(req: IncomingMessage, res: ServerResponse): Promise<void>
  dispose(): Promise<void>
}>
