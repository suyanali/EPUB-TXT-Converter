import './style.css';
import JSZip from 'jszip';
import { registerSW } from 'virtual:pwa-register';
import { convertEpub } from './epub.js';
const $=id=>document.getElementById(id);
const files=[];
$('version').textContent=`v${__APP_VERSION__}`;
const options=()=>({convert:document.querySelector('input[name="convert"]:checked').value,layout:document.querySelector('input[name="layout"]:checked').value,chapters:$('chapters').checked,removeToc:$('removeToc').checked,zip:$('zip').checked});
const cleanName=s=>(s||'book').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').slice(0,140).trim()||'book';
function showFiles(){ $('fileList').replaceChildren(); for(const [i,file] of files.entries()){const row=document.createElement('div');row.className='file-row';const name=document.createElement('span');name.textContent=`${file.name} · ${(file.size/1024/1024).toFixed(1)} MB`;const remove=document.createElement('button');remove.className='subtle';remove.textContent='移除';remove.onclick=()=>{files.splice(i,1);showFiles()};row.append(name,remove);$('fileList').append(row)}$('convertBtn').disabled=!files.length; $('convertBtn').textContent=`開始轉換${files.length?`（${files.length} 本）`:''}`;}
function addFiles(list){let count=0;for(const file of list){if(!file.name.toLowerCase().endsWith('.epub'))continue;files.push(file);count++}showFiles();$('status').textContent=count?`已加入 ${count} 本 EPUB。`:'未找到 EPUB 檔案。'}
$('files').onchange=e=>{addFiles(e.target.files);e.target.value=''};
const drop=$('drop');drop.addEventListener('click',()=> $('files').click());drop.addEventListener('keydown',e=>{if(e.key==='Enter')$('files').click()});drop.tabIndex=0;
for(const type of ['dragenter','dragover'])drop.addEventListener(type,e=>{e.preventDefault();drop.classList.add('dragging')});
for(const type of ['dragleave','drop'])drop.addEventListener(type,e=>{e.preventDefault();drop.classList.remove('dragging')});
drop.addEventListener('drop',e=>addFiles(e.dataTransfer.files));
$('clearBtn').onclick=()=>{files.length=0;showFiles();$('results').replaceChildren();$('status').textContent='已清除檔案。'};
function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
$('convertBtn').onclick=async()=>{
  const opts=options(), batch=[...files], outputs=[];let errors=0;
  $('convertBtn').disabled=true;$('results').replaceChildren();
  for(let i=0;i<batch.length;i++){
    const file=batch[i];$('status').textContent=`轉換中 ${i+1}/${batch.length}：${file.name}`;
    await new Promise(resolve=>setTimeout(resolve,0));
    try{const result=await convertEpub(file,opts);outputs.push({name:cleanName(file.name.replace(/\.epub$/i,''))+'.txt',text:result.text});const p=document.createElement('p');p.textContent=`✓ ${file.name} → TXT（${result.text.length.toLocaleString()} 字元）`;$('results').append(p)}
    catch(err){errors++;const p=document.createElement('p');p.className='error';p.textContent=`✕ ${file.name}：${err.message}`;$('results').append(p)}
  }
  if(outputs.length){
    if(outputs.length>1 && opts.zip){const archive=new JSZip();const used=new Set();for(const output of outputs){let name=output.name,n=2;while(used.has(name))name=output.name.replace(/\.txt$/i,` (${n++}).txt`);used.add(name);archive.file(name,output.text)}const blob=await archive.generateAsync({type:'blob',compression:'DEFLATE'});download(blob,'EPUB-TXT-'+new Date().toISOString().slice(0,10)+'.zip')}
    else {for(const output of outputs)download(new Blob([output.text],{type:'text/plain;charset=utf-8'}),output.name)}
  }
  $('status').textContent=`完成：成功 ${outputs.length} 本，失敗 ${errors} 本。`;$('convertBtn').disabled=false;
};
const online=()=>{$('network').textContent=navigator.onLine?'目前連線中':'目前離線（已快取時可使用）'};window.addEventListener('online',online);window.addEventListener('offline',online);online();
let waitingUpdate=null;
const updateSW=registerSW({immediate:true,onNeedRefresh(){waitingUpdate=updateSW;$('updateBanner').hidden=false},onOfflineReady(){if(!$('status').textContent)$('status').textContent='離線資源已準備完成。'},onRegisteredSW(_url,registration){if(registration){setInterval(()=>{if(navigator.onLine)registration.update().catch(()=>{})},60*60*1000);document.addEventListener('visibilitychange',()=>{if(!document.hidden&&navigator.onLine)registration.update().catch(()=>{})})}}});
$('applyUpdate').onclick=()=>waitingUpdate?.(true);
$('dismissUpdate').onclick=()=>$('updateBanner').hidden=true;
$('checkUpdate').onclick=async()=>{if(!('serviceWorker' in navigator)){$('status').textContent='目前瀏覽器不支援 PWA 更新檢查。';return}const reg=await navigator.serviceWorker.getRegistration();if(!reg){$('status').textContent='尚未安裝離線快取，請先重新整理網站。';return}try{await reg.update();$('status').textContent=$('updateBanner').hidden?'已檢查更新；若有新版，下載完成後會提示。':'已發現新版，請選擇更新。'}catch{$('status').textContent='檢查更新失敗，請確認網路連線。'}};
let installPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('install').hidden=false});
window.addEventListener('appinstalled',()=>{$('install').hidden=true;installPrompt=null});
const isStandalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;
if(!isStandalone)$('install').hidden=false;
$('install').onclick=async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null}else $('installHelp').showModal()};
$('closeHelp').onclick=()=>$('installHelp').close();
