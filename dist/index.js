import y from"path";import{fileURLToPath as N,pathToFileURL as R}from"url";import{installSourceMapSupport as I,resolveTsPath as F,transform as _,transformDynamicImport as l}from"@esbuild-kit/core-utils";import{getTsconfig as L,createPathsMatcher as M}from"get-tsconfig";import P from"fs";const m=I(),f=L(),j=f==null?void 0:f.config,O=f&&M(f),g=/\.([cm]?ts|[tj]sx)$/,k=t=>{const r=y.extname(t);if(r===".mjs"||r===".mts")return"module";if(r===".cjs"||r===".cts")return"commonjs"},d=new Map;async function x(t){if(d.has(t))return d.get(t);if(!await P.promises.access(t).then(()=>!0,()=>!1)){d.set(t,void 0);return}const s=await P.promises.readFile(t,"utf8");try{const o=JSON.parse(s);return d.set(t,o),o}catch{throw new Error(`Error parsing: ${t}`)}}async function $(t){let r=new URL("package.json",t);for(;!r.pathname.endsWith("/node_modules/package.json");){const s=N(r),o=await x(s);if(o)return o;const e=r;if(r=new URL("../package.json",r),r.pathname===e.pathname)break}}async function v(t){var r;const s=await $(t);return(r=s==null?void 0:s.type)!=null?r:"commonjs"}var A=Object.defineProperty,V=Object.defineProperties,C=Object.getOwnPropertyDescriptors,E=Object.getOwnPropertySymbols,q=Object.prototype.hasOwnProperty,z=Object.prototype.propertyIsEnumerable,S=(t,r,s)=>r in t?A(t,r,{enumerable:!0,configurable:!0,writable:!0,value:s}):t[r]=s,U=(t,r)=>{for(var s in r||(r={}))q.call(r,s)&&S(t,s,r[s]);if(E)for(var s of E(r))z.call(r,s)&&S(t,s,r[s]);return t},D=(t,r)=>V(t,C(r));const B=[".js",".json",".ts",".tsx",".jsx"];async function J(t,r,s){let o;for(const e of B)try{return await u(t+e,r,s,!0)}catch(n){if(o===void 0){const{message:a}=n;n.message=n.message.replace(`${e}'`,"'"),n.stack=n.stack.replace(a,n.message),o=n}}throw o}async function W(t,r,s){const o=t.endsWith("/")?"index":`${y.sep}index`;try{return await J(t+o,r,s)}catch(e){const{message:n}=e;throw e.message=e.message.replace(`${o}'`,"'"),e.stack=e.stack.replace(n,e.message),e}}const T="file://",H=/^\.{0,2}\//,u=async function(t,r,s,o){var e;if(t.startsWith("node:")&&(t=t.slice(5)),t.endsWith("/"))return await W(t,r,s);const n=t.startsWith(T)||H.test(t);if(O&&!n){const c=O(t);for(const p of c)try{return await u(R(p).toString(),r,s)}catch{}}if(g.test(r.parentURL)){const c=F(t);if(c)try{return await u(c,r,s,!0)}catch(p){if(p.code!=="ERR_MODULE_NOT_FOUND")throw p}}let a;try{a=await s(t,r,s)}catch(c){if(c instanceof Error&&n&&!o){if(c.code==="ERR_UNSUPPORTED_DIR_IMPORT")return await W(t,r,s);if(c.code==="ERR_MODULE_NOT_FOUND")return await J(t,r,s)}throw c}if(a.url.endsWith(".json"))return D(U({},a),{format:"json"});let{format:i}=a;return a.url.startsWith(T)&&(i=(e=k(a.url))!=null?e:i,i||(i=await v(a.url))),D(U({},a),{format:i})},K=async function(t,r,s){process.send&&process.send({type:"dependency",path:t}),t.endsWith(".json")&&(r.importAssertions||(r.importAssertions={}),r.importAssertions.type="json");const o=await s(t,r,s);if(!o.source)return o;const e=o.source.toString();if(o.format==="json"||g.test(t)){const a=await _(e,t,{format:"esm",tsconfigRaw:j});return a.map&&m.set(t,a.map),{format:"module",source:a.code}}const n=l({code:e});return n&&(o.source=n.code,n.map&&m.set(t,n.map)),o},Q=async function(t,r,s){var o;return t.endsWith(".json")?{format:"module"}:t.startsWith("file:")?{format:(o=k(t))!=null?o:await v(t)}:await s(t,r,s)},X=async function(t,r,s){const{url:o}=r;if(process.send&&process.send({type:"dependency",path:o}),o.endsWith(".json")||g.test(o)){const a=await _(t.toString(),o,{format:"esm",tsconfigRaw:j});return a.map&&m.set(o,a.map),{source:a.code}}const e=await s(t,r,s),n=l({code:e.source.toString()});return n&&(e.source=n.code,n.map&&m.set(o,n.map)),e},h=[16,12,0],w=process.version.slice(1).split(".").map(Number),b=(w[0]-h[0]||w[1]-h[1]||w[2]-h[2])<0,Y=b?Q:void 0,Z=b?X:void 0;export{Y as getFormat,K as load,u as resolve,Z as transformSource};
