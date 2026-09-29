'use client'

import {useEffect, useMemo, useState} from 'react'
import {supabase} from '../lib/supabase'

type RecordItem={
  id:string
  archive_id:string
  type:string
  title:string
  body:string
  author:string
  status:string
  version:number
  date:string
  origin:string
}

export default function Home(){
  const [records,setRecords]=useState<RecordItem[]>([])
  const [query,setQuery]=useState('')
  const [submittedQuery,setSubmittedQuery]=useState('')
  const [recordType,setRecordType]=useState('Declaration')
  const [selected,setSelected]=useState<RecordItem|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [title,setTitle]=useState('FLY DECLARATION')
  const [author,setAuthor]=useState('')
  const [origin,setOrigin]=useState('')
  const [version,setVersion]=useState('V2 · Second Article')
  const [body,setBody]=useState('')
  const [saving,setSaving]=useState(false)

  useEffect(()=>{
    loadRecords()
  },[])

  async function loadRecords(){
    setLoading(true)
    setError('')

    const {data: recordData, error: recordError}=await supabase
      .from('archive_records')
      .select(`
        id,
        archive_id,
        type,
        title,
        status,
        current_version,
        original_creation_at,
        created_at
      `)
      .order('created_at',{ascending:false})

    if(recordError){
      console.error('FAM archive_records error:',recordError)
      setError(recordError.message)
      setLoading(false)
      return
    }

    const baseRecords=recordData||[]

    const {data: versionData, error: versionError}=await supabase
      .from('archive_versions')
      .select(`
        record_id,
        version_number,
        title,
        body,
        author_id,
        created_at
      `)
      .order('version_number',{ascending:false})

    if(versionError){
      console.error('FAM archive_versions error:',versionError)
      setError(versionError.message)
      setLoading(false)
      return
    }

    const versions=versionData||[]

    const mapped=baseRecords.map((r:any)=>{
      const current=versions.find((v:any)=>v.record_id===r.id)

      return {
        id:r.id,
        archive_id:r.archive_id,
        type:r.type,
        title:current?.title||r.title,
        body:current?.body||'',
        author:current?.author_id||'',
        status:r.status,
        version:current?.version_number||r.current_version||1,
        date:r.original_creation_at
          ? new Date(r.original_creation_at).toLocaleDateString()
          : new Date(r.created_at).toLocaleDateString(),
        origin:r.original_creation_at||''
      }
    })

    setRecords(mapped)
    setLoading(false)
  }
  async function enterIntoArchive(){
    if(!title.trim()){
      setError('A title is required.')
      return
    }

    const user=auth.currentUser

    if(!user){
      setError('Sign in to FAM before entering a record into the archive.')
      return
    }

    setSaving(true)
    setError('')

    try{
      const token=await user.getIdToken()

      const response=await fetch('/api/archive',{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          Authorization:`Bearer ${token}`,
        },
        body:JSON.stringify({
          title:title.trim(),
          body,
          type:recordType,
          origin:origin||null,
        }),
      })

      const result=await response.json()

      if(!response.ok){
        throw new Error(result.error||'Archive creation failed.')
      }

      await loadRecords()

      setQuery('')
      setSubmittedQuery('')

      alert(
        `Record entered into FAM\\n\\n${result.archiveId}`
      )

    }catch(err:any){
      console.error('FAM archive create error:',err)
      setError(err?.message||'Archive creation failed.')
    }finally{
      setSaving(false)
    }
  }

  const filtered=useMemo(()=>{
    const q=submittedQuery.trim().toLowerCase()

    if(!q) return records

    return records.filter(r =>
      [
        r.archive_id,
        r.type,
        r.title,
        r.body,
        r.author,
        r.status,
        String(r.version),
        r.date,
        r.origin
      ]
      .join(' ')
      .toLowerCase()
      .includes(q)
    )
  },[records,submittedQuery])

  return <main>

    <header className="top">
      <div className="brand">
        <span className="sig">FAM</span>
        <span className="sub">FUTURE ARCHIVES MODERN</span>
      </div>

      <nav>
        <button onClick={()=>document.getElementById('archive')?.scrollIntoView({behavior:'smooth'})}>Archive</button>
        <button onClick={()=>document.getElementById('create')?.scrollIntoView({behavior:'smooth'})}>Create Record</button>
        <button onClick={()=>document.getElementById('timeline')?.scrollIntoView({behavior:'smooth'})}>Timeline</button>
        <button onClick={()=>alert('FAM Originality Protocol\\n\\nNative Original · Deposited Original · Digitized Original')}>Protocol</button>
      </nav>
    </header>

    <section className="hero wrap">
      <div>
        <div className="eyebrow">
          Independent Digital Archive · DMNDX Infrastructure
        </div>

        <h1>
          Preserve what<br/>comes next.
        </h1>

        <p>
          FAM is a digital archive for declarations, documents, memories,
          artifacts and cultural records.
        </p>

        <form
          className="search"
          onSubmit={e=>{
            e.preventDefault()
            setSubmittedQuery(query)
            document.getElementById('archive')?.scrollIntoView({behavior:'smooth'})
          }}
        >
          <input
            value={query}
            onChange={e=>setQuery(e.target.value)}
            placeholder="Search the archives…"
            aria-label="Search the archives"
          />

          <button type="submit">
            Search
          </button>
        </form>

        <div className="sub" style={{marginTop:'12px'}}>
          {submittedQuery
            ? `${filtered.length} ${filtered.length===1?'record':'records'} found`
            : `${records.length} ${records.length===1?'record':'records'} indexed`}
        </div>
      </div>

      <div className="stat">
        <strong>{String(records.length).padStart(4,'0')}</strong>
        <span>Records currently entered</span>
        <span className="verified">
          ● Connected to archive database
        </span>
      </div>
    </section>

    <section id="archive" className="wrap">
      <div className="sectionhead">
        <h2>Archive</h2>
        <span>Live Database</span>
      </div>

      {loading && (
        <div className="sub" style={{padding:'28px 0'}}>
          Loading archive…
        </div>
      )}

      {!loading && error && (
        <div className="sub" style={{padding:'28px 0'}}>
          Archive connection error: {error}
        </div>
      )}

      {!loading && !error && filtered.length===0 && (
        <div className="sub" style={{padding:'28px 0'}}>
          {submittedQuery
            ? `No records found for “${submittedQuery}”.`
            : 'No archive records yet.'}
        </div>
      )}

      {!loading && !error && filtered.length>0 && (
        <div className="records">
          {filtered.map(r=>(
            <article
              className="record"
              key={r.id}
              onClick={()=>setSelected(r)}
            >
              <div>
                <div className="type">{r.type}</div>
                <h3>{r.title}</h3>
                <p>
                  {r.body
                    ? r.body.slice(0,180)
                    : 'No declaration text entered yet.'}
                </p>
              </div>

              <div className="meta">
                <span>{r.archive_id}</span>
                <span className={r.status==='archived'||r.status==='sealed'
                  ? 'verified'
                  : ''}>
                  {r.status}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>


    <section id="create" className="create wrap">
      <div className="createIntro">
        <div className="eyebrow">Native Record Creation</div>
        <h2>Create the original.</h2>
        <p>
          Compose the record directly inside FAM. When entered into the archive,
          its original text becomes the first preserved version.
        </p>
      </div>

      <div className="types" style={{marginTop:'25px'}}>
        {[
          'Declaration',
          'Letter',
          'Memorial',
          'Statement',
          'Artifact',
          'Image',
          'Audio',
          'Video',
          'Event',
          'Biography',
          'Collection',
          'Plan / Blueprint',
          'Text',
          'Composite Archive'
        ].map(type => (
          <button
            key={type}
            type="button"
            className={`chip ${recordType===type?'active':''}`}
            onClick={()=>setRecordType(type)}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="editor">
        <div className="row">
          <Field label="Title" value={title} set={setTitle}/>
          <Field label="Author" value={author} set={setAuthor} placeholder="Author / creator"/>
        </div>

        <div className="row">
          <div className="field">
            <label>Original creation</label>
            <input
              type="date"
              value={origin}
              onChange={e=>setOrigin(e.target.value)}
            />
          </div>
          <Field label="Current version" value={version} set={setVersion}/>
        </div>

        <label className="label">
          {recordType === 'Declaration' ? 'Declaration text' : `${recordType} content`}
        </label>

        <textarea
          value={body}
          onChange={e=>setBody(e.target.value)}
          placeholder="Begin the declaration…"
        />

        <div className="sealbar">
          <div className="sealnote">
            Creation method: <b>FAM Native Editor</b><br/>
            Archive status: <b>{saving?'SAVING…':'READY'}</b>
          </div>

          <button
            className="seal"
            onClick={enterIntoArchive}
            disabled={saving}
          >
            {saving?'Entering…':'Enter Into Archive'}
          </button>
        </div>
      </div>
    </section>

    {error && (
      <div className="wrap sub" style={{paddingTop:'18px'}}>
        {error}
      </div>
    )}

    <section id="timeline" className="timeline wrap">
      <div className="sectionhead">
        <h2>Record lifecycle</h2>
        <span>Provenance model</span>
      </div>

      <div className="events">
        <Event n="01 · CREATE" t="Native Original" d="Document begins inside FAM."/>
        <Event n="02 · REVISE" t="Version History" d="Earlier states remain traceable."/>
        <Event n="03 · SEAL" t="Integrity Record" d="A final state receives its archive identity."/>
        <Event n="04 · CARRY FORWARD" t="Future Archive" d="Audio, video and AI-mic originals can attach later."/>
      </div>
    </section>

    {selected && (
      <div className="modal" onClick={()=>setSelected(null)}>
        <div className="modalbox" onClick={e=>e.stopPropagation()}>

          <div className="modalhead">
            <div>
              <div className="eyebrow">
                FAM Official Digital Record
              </div>

              <h2>{selected.title}</h2>

              <div className="sub">
                {selected.archive_id} · {selected.date} · {selected.status}
              </div>
            </div>

            <button
              className="close"
              onClick={()=>setSelected(null)}
            >
              ×
            </button>
          </div>

          <article className="document">
            <div className="folio">
              {selected.archive_id} · Version {selected.version}
            </div>

            <h1>{selected.title}</h1>

            <p>
              {selected.body||'This record contains no declaration text yet.'}
            </p>

            <div className="sealcard">
              <div>
                STATUS<br/>
                <b>{selected.status.toUpperCase()}</b>
              </div>

              <div>
                TYPE<br/>
                <b>{selected.type.toUpperCase()}</b>
              </div>

              <div>
                VERSION<br/>
                <b>V{selected.version}</b>
              </div>

              <div>
                INTEGRITY<br/>
                <b>{selected.status==='sealed'||selected.status==='archived'
                  ? 'RECORDED'
                  : 'DRAFT'}
                </b>
              </div>
            </div>
          </article>

        </div>
      </div>
    )}

  </main>
}

function Field({
  label,
  value,
  set,
  placeholder
}:{
  label:string
  value:string
  set:(v:string)=>void
  placeholder?:string
}){
  return (
    <div className="field">
      <label>{label}</label>
      <input
        value={value}
        onChange={e=>set(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

function Event({
  n,t,d
}:{
  n:string
  t:string
  d:string
}){
  return (
    <div className="event">
      <small>{n}</small>
      <b>{t}</b>
      <p>{d}</p>
    </div>
  )
}
