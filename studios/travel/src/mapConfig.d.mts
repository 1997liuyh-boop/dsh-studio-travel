import type { IncomingMessage, ServerResponse } from 'node:http'
export function createMapConfig(privateRoot: string): {
  handle(req: IncomingMessage, res: ServerResponse, path: string): Promise<boolean>
}
