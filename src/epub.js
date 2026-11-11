import JSZip from 'jszip';
import * as OpenCC from 'opencc-js';
const xml = text => new DOMParser().parseFromString(text, 'application/xml');
const xhtml = text => new DOMParser().parseFromString(text, 'text/html');
const byLocal = (root, name) => [...root.getElementsByTagName('*')].filter(e => e.localName === name);
const attr = (el, key) => el?.getAttribute(key) || '';
const resolve = (relative, base) => {
  const path = (base.split('/').slice(0,-1).concat(relative.split('/')));
  const out=[];
  for (const part of path) { if (!part || part === '.') continue; if (part === '..') out.pop(); else out.push(part); }
  return out.join('/');
};
const normalize = s => s.replace(/\u00a0/g,' ').replace(/[\t ]+/g,' ').trim();
const BLOCKS = new Set(['p','div','section','article','blockquote','pre','li','h1','h2','h3','h4','h5','h6','dt','dd','tr']);
const HEADINGS = new Set(['h1','h2','h3','h4','h5','h6']);
function extract(doc, keepHeadings) {
  doc.querySelectorAll('script,style,svg,nav,iframe,canvas,form,button').forEach(n=>n.remove());
  const body = doc.body || doc.documentElement;
  const parts=[];
  let buffer='';
  function flush(heading=false) {
    const cleaned=normalize(buffer.replace(/\s*\n\s*/g,'\n'));
    if(cleaned) parts.push({text:cleaned,heading});
    buffer='';
  }
  function walk(node) {
    if(node.nodeType===3){buffer+=node.nodeValue||'';return;}
    if(node.nodeType!==1)return;
    const tag=node.localName?.toLowerCase();
    if(['img','video','audio'].includes(tag))return;
    if(tag==='br'){buffer+='\n';return;}
    if(HEADINGS.has(tag) && !keepHeadings)return;
    const isBlock=BLOCKS.has(tag);
    if(isBlock)flush();
    for(const child of node.childNodes)walk(child);
    if(isBlock)flush(HEADINGS.has(tag));
  }
  for(const child of body.childNodes)walk(child);
  flush();
  return parts;
}
function render(parts, layout) {
  const lines=[];
  for (const p of parts) {
    let text=p.text.replace(/\r/g,'').replace(/\n+/g,' ').trim();
    if (!text) continue;
    if (layout==='novel' && !p.heading) text='　　'+text.replace(/^　+/, '');
    if (layout==='compact') lines.push(text);
    else if (layout==='novel' && p.heading) lines.push('\n\n'+text+'\n');
    else lines.push(text);
  }
  return (layout==='compact'?lines.join('\n'):lines.join('\n\n')).replace(/\n{4,}/g,'\n\n\n').trim()+'\n';
}
export async function convertEpub(file, options) {
  let zip;
  try { zip=await JSZip.loadAsync(file); } catch { throw new Error('無法解開 EPUB：檔案可能損壞或不是 EPUB。'); }
  const container=zip.file('META-INF/container.xml');
  if (!container) throw new Error('缺少 META-INF/container.xml，並非有效 EPUB。');
  const c=xml(await container.async('string'));
  const opfPath=attr(byLocal(c,'rootfile')[0],'full-path');
  if (!opfPath) throw new Error('找不到 EPUB 套件描述檔。');
  const opfFile=zip.file(opfPath);
  if (!opfFile) throw new Error('找不到 EPUB OPF 檔案。');
  const opf=xml(await opfFile.async('string'));
  const items=new Map(byLocal(opf,'item').map(el=>[attr(el,'id'),{href:attr(el,'href'),media:attr(el,'media-type'),properties:attr(el,'properties')} ]));
  const refs=byLocal(opf,'itemref');
  const metadataTitle=byLocal(opf,'title')[0]?.textContent?.trim() || file.name.replace(/\.epub$/i,'');
  const parts=[];
  for (const ref of refs) {
    if (attr(ref,'linear')==='no') continue;
    const item=items.get(attr(ref,'idref'));
    if (!item || !/xhtml|html/i.test(item.media)) continue;
    if (options.removeToc && item.properties.split(/\s+/).includes('nav')) continue;
    const path=resolve(decodeURI(item.href.split('#')[0]),opfPath);
    const entry=zip.file(path);
    if (!entry) continue;
    const html=await entry.async('string');
    const doc=xhtml(html);
    if (options.removeToc && /(?:^|\/)(?:toc|nav|contents)(?:\.[^/]*)?$/i.test(path) && doc.querySelector('nav, [epub\\:type="toc"]')) continue;
    parts.push(...extract(doc,options.chapters));
  }
  if (!parts.length) throw new Error('沒有找到可擷取的正文，可能是圖片型或不支援的 EPUB。');
  let text=render(parts,options.layout);
  if (options.convert!=='none') {
    const converter=OpenCC.Converter({from:'cn',to:options.convert==='twp'?'twp':'tw'});
    text=converter(text);
  }
  return {text, title:metadataTitle, chapters:parts.filter(p=>p.heading).length};
}
