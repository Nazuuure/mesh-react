import http from 'node:http'
import {readFile} from 'node:fs/promises'
import {apply,syncGeography,expandCatalog,scheduleDispatch,seed} from './model.mjs'
let load,save,close
if(process.env.DATABASE_URL){
  const {Client}=await import('pg')
  const db=new Client({connectionString:process.env.DATABASE_URL});await db.connect()
  await db.query('CREATE TABLE IF NOT EXISTS demo(id integer PRIMARY KEY, body jsonb NOT NULL)')
  await db.query('INSERT INTO demo VALUES(1,$1) ON CONFLICT DO NOTHING',[seed()])
  load=async()=>(await db.query('SELECT body FROM demo WHERE id=1')).rows[0].body
  save=s=>db.query('UPDATE demo SET body=$1 WHERE id=1',[s]);close=()=>db.end()
}else{
  const {DatabaseSync}=await import('node:sqlite')
  const db=new DatabaseSync(process.env.DB_FILE||'mesh.sqlite')
  db.exec('CREATE TABLE IF NOT EXISTS demo(id INTEGER PRIMARY KEY,body TEXT NOT NULL)')
  db.prepare('INSERT OR IGNORE INTO demo VALUES(1,?)').run(JSON.stringify(seed()))
  load=()=>JSON.parse(db.prepare('SELECT body FROM demo WHERE id=1').get().body)
  save=s=>db.prepare('UPDATE demo SET body=? WHERE id=1').run(JSON.stringify(s));close=()=>db.close()
}
const roles={buyer:['order','choice'],seller:['product','restock','transfer'],wb:['stuck','failure','day','reset'],pvz:['confirmReturn','rescue','shortage','reply','ship','receive','issue','return','capacity']}
const names={buyer:'Покупатель',seller:'Продавец',wb:'Диспетчер WB',pvz:'Сотрудник ПВЗ'}
const base=Number(process.env.PORT||8000)
const initial=await load()
const geographyUpdated=syncGeography(initial)
const catalogExpanded=expandCatalog(initial)
const startClock=!initial.clockAt
if(catalogExpanded||geographyUpdated)initial.version++
if(startClock)initial.clockAt=Date.now()
if(catalogExpanded||geographyUpdated||startClock)await save(initial)
function tick(s){
 const days=Math.max(0,Math.floor((Date.now()-s.clockAt)/120000))
 s.day+=days;s.clockAt+=days*120000
 return s
}
const cameraUrls = {'R-01':process.env.ROVER_R01_CAMERA_URL, 'R-02':process.env.ROVER_R02_CAMERA_URL}
const respond=s=>({...s,cameraUrls,serverNow:Date.now()})
let queue=Promise.resolve()
function enqueue(task){
 const result=queue.then(task)
 queue=result.catch(()=>{})
 return result
}
let scheduling=false
const scheduler=setInterval(()=>{
 if(scheduling)return
 scheduling=true
 enqueue(async()=>{
   const state=tick(await load())
   if(!scheduleDispatch(state,Date.now()))return
   state.version++
   await save(state)
 }).catch(error=>console.error('Планировщик рейсов:',error.message))
   .finally(()=>{scheduling=false})
},500)
const site = new URL('./dist/', import.meta.url)
const assetTypes = {'.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg'}
const server=http.createServer(async(req,res)=>{
 const send=(status,value,type='application/json')=>{res.writeHead(status,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store'});res.end(type==='application/json'?JSON.stringify(value):value)}
 try{
  if(req.method==='GET'&&req.url==='/api/state')return send(200,respond(tick(await load())))
  if(req.method==='GET'&&req.url==='/health')return send(200,{ok:true})
  const [,role,...parts]=new URL(req.url,'http://localhost').pathname.split('/')
  const knownRole=Object.hasOwn(roles,role)
  const route=parts.join('/')
  if(req.method==='POST'&&knownRole&&route==='api/actions'){
    if(req.headers['content-type']?.split(';')[0]!=='application/json')return send(415,{error:'Нужен JSON'})
    let body='';for await(const chunk of req){body+=chunk;if(body.length>32000)return send(413,{error:'Слишком большой запрос'})}
    const action=JSON.parse(body)
    if(!roles[role].includes(action.type))return send(403,{error:'Действие выполняется на сайте соответствующего участника'})
    const result=await enqueue(async()=>{
      let s=tick(await load())
      if(action.version!==s.version)throw Error('Данные изменились. Обновите экран и повторите действие')
      const version=s.version
      const now=Date.now()
      if(['rescue','confirmReturn'].includes(action.type)){
        const trip=s.trips.find(t=>t.id===Number(action.trip))
        const office=action.type==='rescue'?(trip?.incident?.office??trip?.route[0]):trip?.route[0]
        if(!office||office!==action.place)throw Error('Подтвердите событие в назначенном пункте')
      }
      let notice
      if(action.type==='reset')s={...seed(),clockAt:now};else notice=apply(s,action,now)
      scheduleDispatch(s,now)
      s.version=version+1
      await save(s)
      return {...respond(s),notice}
    })
    return send(200,result)
  }
  if(req.method==='GET'&&req.url==='/'){res.writeHead(302,{Location:'/buyer/'});return res.end()}
  if(req.method==='GET'&&knownRole&&(route===''||route==='index.html')){
    try {
      return send(200,await readFile(new URL('index.html',site)),'text/html')
    } catch(error){
      if(error.code!=='ENOENT')throw error
      return send(503,{error:'Соберите интерфейс командой npm run build или откройте npm run dev'})
    }
  }
  const asset = req.url.match(/^\/assets\/([a-zA-Z0-9_-]+(\.[a-z]+))$/)
  if(req.method==='GET'&&asset&&Object.hasOwn(assetTypes,asset[2])){
    try {
      return send(200,await readFile(new URL('assets/'+asset[1],site)),assetTypes[asset[2]])
    } catch(error){
      if(error.code!=='ENOENT')throw error
    }
  }
  send(404,{error:'Адрес не найден'})
 }catch(e){send(400,{error:e.message})}
})
server.on('error',e=>{console.error('Порт '+base+': '+e.message);process.exit(1)})
server.listen(base,process.env.HOST||'127.0.0.1',()=>{
 for(const [role,title] of Object.entries(names))console.log(title+'  http://localhost:'+base+'/'+role+'/')
})
process.on('SIGTERM',()=>{
 clearInterval(scheduler)
 server.close(()=>queue.then(close))
})
