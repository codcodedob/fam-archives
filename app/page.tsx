'use client'

import {useMemo, useState} from 'react'

type RecordItem={id:string;type:string;title:string;desc:string;date:string;status:'DRAFT'|'ARCHIVED';version:string}

const initial:RecordItem[]=[{
  id:'FAM-DEC-2026-0001', type:'Declaration', title:'FLY DECLARATION',
  desc:'Second article / V2 record. Historical precursor acknowledged; current source entered natively into FAM.',
  date:'27 SEP 2026', status:'DRAFT', version:'V2 · Second Article'
}]

export default function Home(){
  const [records,setRecords]=useState(initial)
  const [query,setQuery]=useState('')
  const [selected,setSelected]=useState<RecordItem|null>(null)
  const [title,setTitle]=useState('FLY DECLARATION')
  const [author,setAuthor]=useState('')
  const [origin,setOrigin]=useState('')
  const [version,setVersion]=useState('V2 · Second Article')
  const [body,setBody]=useState('')
  const [status,setStatus]=useState<'DRAFT'|'ARCHIVED'>('DRAFT')
  const filtered=useMemo(()=>records.filter(r=>(r.title+r.desc+r.type+r.id).toLowerCase().includes(query.toLowerCase())),[records,query])

  function seal(){
    const updated={...records[0],title:title||records[0].title,status:'ARCHIVED' as const,version}
    setRecords([updated,...records.slice(1)])
    setStatus('ARCHIVED')
    setSelected(updated)
  }

  return <main>
    <header className="top"><div className="brand"><span className="sig">FAM</span><span className="sub">FUTURE ARCHIVES MODERN</span></div><nav><button onClick={()=>document.getElementById('archive')?.scrollIntoView({behavior:'smooth'})}>Archive</button><button onClick={()=>document.getElementById('create')?.scrollIntoView({behavior:'smooth'})}>Create Record</button><button onClick={()=>document.getElementById('timeline')?.scrollIntoView({behavior:'smooth'})}>Timeline</button><button onClick={()=>alert('FAM Originality Protocol\n\nNative Original · Deposited Original · Digitized Original')}>Protocol</button></nav></header>
    <section className="hero wrap"><div><div className="eyebrow">Independent Digital Archive · DMNDX Infrastructure</div><h1>Preserve what<br/>comes next.</h1><p>FAM is a digital archive for declarations, documents, memories, artifacts and cultural records. Native records are created inside the archive, versioned, sealed and carried forward with their provenance intact.</p><div className="search"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search the archives…"/><button>Search</button></div></div><div className="stat"><strong>{String(records.length).padStart(4,'0')}</strong><span>Records currently entered</span><span className="verified">● Native creation protocol ready</span></div></section>

    <section id="archive" className="wrap"><div className="sectionhead"><h2>Recently entered</h2><span>Archive / 2026</span></div><div className="records">{filtered.map(r=><article className="record" key={r.id} onClick={()=>setSelected(r)}><div><div className="type">{r.type}</div><h3>{r.title}</h3><p>{r.desc}</p></div><div className="meta"><span>{r.id}</span><span className={r.status==='ARCHIVED'?'verified':''}>{r.status}</span></div></article>)}</div></section>

    <section id="create" className="create wrap"><div className="createIntro"><div className="eyebrow">Native Record Creation</div><h2>Create the original.</h2><p>Compose a record directly inside FAM. Before it is sealed, every revision remains part of the creation history. When finalized, the record receives a permanent archive identity and integrity fingerprint.</p><div className="types"><button className="chip active">Declaration</button><button className="chip">Letter</button><button className="chip">Memorial</button><button className="chip">Statement</button><button className="chip">Artifact</button><button className="chip">Other</button></div></div><div className="editor"><div className="row"><Field label="Title" value={title} set={setTitle}/><Field label="Author" value={author} set={setAuthor} placeholder="Author / creator"/></div><div className="row"><Field label="Original creation" value={origin} set={setOrigin} placeholder="Earlier date, if known"/><Field label="Current version" value={version} set={setVersion}/></div><label className="label">Declaration text</label><textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Begin the declaration…"/><div className="sealbar"><div className="sealnote">Creation method: <b>FAM Native Editor</b><br/>Current status: <b>{status}</b> · Historical precursor can be referenced without being overwritten.</div><button className="seal" onClick={seal}>Enter Into Archive</button></div></div></section>

    <section id="timeline" className="timeline wrap"><div className="sectionhead"><h2>Record lifecycle</h2><span>Provenance model</span></div><div className="events"><Event n="01 · CREATE" t="Native Original" d="Document begins inside FAM."/><Event n="02 · REVISE" t="Version History" d="Earlier states remain traceable."/><Event n="03 · SEAL" t="Integrity Record" d="A final state receives its archive identity."/><Event n="04 · CARRY FORWARD" t="Future Archive" d="Audio, video and AI-mic originals can attach later."/></div></section>

    {selected && <div className="modal" onClick={()=>setSelected(null)}><div className="modalbox" onClick={e=>e.stopPropagation()}><div className="modalhead"><div><div className="eyebrow">FAM Official Digital Record</div><h2>{selected.title}</h2><div className="sub">{selected.id} · {selected.date} · {selected.status}</div></div><button className="close" onClick={()=>setSelected(null)}>×</button></div><article className="document"><div className="folio">{selected.id} · Native Digital Original · {selected.version}</div><h1>{selected.title}</h1><p>{body||'This record is ready to receive its declaration text.'}</p><div className="sealcard"><div>STATUS<br/><b>{selected.status}</b></div><div>CREATION<br/><b>NATIVE EDITOR</b></div><div>VERSION<br/><b>{selected.version.split('·')[0].trim()}</b></div><div>INTEGRITY<br/><b>{selected.status==='ARCHIVED'?'SEALED':'DRAFT'}</b></div></div></article></div></div>}
  </main>
}
function Field({label,value,set,placeholder}:{label:string;value:string;set:(v:string)=>void;placeholder?:string}){return <div className="field"><label>{label}</label><input value={value} onChange={e=>set(e.target.value)} placeholder={placeholder}/></div>}
function Event({n,t,d}:{n:string;t:string;d:string}){return <div className="event"><small>{n}</small><b>{t}</b><p>{d}</p></div>}
