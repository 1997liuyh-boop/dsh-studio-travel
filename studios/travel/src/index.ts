import { fileURLToPath } from 'node:url'
import { createAtlas, resolveAtlasRoot } from './atlas.mjs'
import { createMapConfig } from './mapConfig.mjs'
import type { IncomingMessage, ServerResponse } from 'node:http'
export const name = 'dsh-studio-travel'
export const inject = ['studioProjects']
declare const STUDIO_PROJECT: { name: string; icon: string; description: string }

/** 旅行页面与本地编辑器独立安装；保存位置沿用既有数据目录。 */
export async function apply(ctx: {studioProjects:{register(page: {id:string;name:string;icon:string;description:string;root:string;handle(req:IncomingMessage,res:ServerResponse,path:string):Promise<boolean>}):()=>void}; effect(callback:()=>()=>void|Promise<void>,label:string):void}): Promise<void> {
  const atlas = await createAtlas(resolveAtlasRoot())
  const mapConfig = createMapConfig(resolveAtlasRoot())
  ctx.effect(()=>()=>atlas.dispose(),'旅行编辑器')
  ctx.effect(()=>ctx.studioProjects.register({id:'travel',...STUDIO_PROJECT,root:fileURLToPath(new URL('../static/',import.meta.url)),async handle(req,res,path) {
    if (await mapConfig.handle(req,res,path)) return true
    if (path === 'data' && ['GET','HEAD'].includes(req.method ?? '')) {
      const body=JSON.stringify(await atlas.data());res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(req.method === 'HEAD' ? undefined : body);return true
    }
    if (path.startsWith('__travelatlas/editor/') || path.startsWith('media/user/')) {await atlas.handle(req,res);return true}
    return false
  }}),'旅行页面')
}
