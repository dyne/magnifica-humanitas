import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const theme=path.resolve(process.env.MH_THEME_DIR || path.join(root,'../../../vite-theme'));
const special={
  '/theme/tokens.css':path.join(theme,'src/tokens.css'),
  '/theme/components.css':path.join(theme,'src/components.css'),
  '/theme/syne.woff2':path.join(theme,'node_modules/@fontsource/syne/files/syne-latin-700-normal.woff2'),
  '/theme/inter.woff2':path.join(theme,'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')
};
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const local=path.resolve(root,`.${pathname==='/'?'/index.html':pathname}`);
  const file=special[pathname] || (local.startsWith(root+path.sep)?local:null);
  if(!file || !fs.existsSync(file) || !fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)] || 'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
});
server.listen(Number(process.env.MH_STORYBOARD_PORT || 4285),'127.0.0.1',()=>console.log('Storyboard: http://127.0.0.1:4285'));
