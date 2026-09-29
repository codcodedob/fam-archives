import {NextResponse} from 'next/server'
import crypto from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
import {adminAuth,adminDb} from '../../../../lib/firebase-admin'

export const runtime='nodejs'

const supabase=createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth:{
      autoRefreshToken:false,
      persistSession:false
    }
  }
)

const allowedTypes=[
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
]

const prefixMap:Record<string,string>={
  Declaration:'DEC',
  Letter:'LET',
  Memorial:'MEM',
  Statement:'STA',
  Artifact:'ART',
  Image:'IMG',
  Audio:'AUD',
  Video:'VID',
  Event:'EVT',
  Biography:'BIO',
  Collection:'COL',
  'Plan / Blueprint':'PLN',
  Text:'TXT',
  'Composite Archive':'ARC'
}

function hash(value:string){
  return crypto.createHash('sha256').update(value).digest('hex')
}

export async function POST(request:Request){
  try{
    const authHeader=request.headers.get('authorization')||''

    if(!authHeader.startsWith('Bearer ')){
      return NextResponse.json(
        {error:'Authentication required.'},
        {status:401}
      )
    }

    const token=authHeader.slice(7)
    const decoded=await adminAuth.verifyIdToken(token)
    const input=await request.json()

    const title=String(input.title||'').trim()
    const body=String(input.body||'')
    const type=allowedTypes.includes(String(input.type))
      ? String(input.type)
      : 'Declaration'

    const origin=input.origin
      ? String(input.origin)
      : null

    if(!title){
      return NextResponse.json(
        {error:'Title is required.'},
        {status:400}
      )
    }

    // Existing DMNDX/Firebase user record.
    const userSnapshot=await adminDb
      .collection('users')
      .where('uid','==',decoded.uid)
      .limit(1)
      .get()

    if(userSnapshot.empty){
      return NextResponse.json(
        {error:'Authenticated Firebase user was not found in the users collection.'},
        {status:403}
      )
    }

    const selfDoc=userSnapshot.docs[0]
    const selfData=selfDoc.data()

    const selfUserId=String(selfData.id||'').trim()

    if(!selfUserId){
      return NextResponse.json(
        {error:'The authenticated user has no users.id value.'},
        {status:403}
      )
    }

    // Existing FAM executive clearance rule.
    const companySnapshot=await adminDb
      .collection('companies')
      .doc('futureArchivesModern')
      .get()

    const companyData=companySnapshot.exists
      ? companySnapshot.data()||{}
      : {}

    const executiveOfficialAGX=
      String(companyData.executiveofficialAGX||'').trim()

    const isExecutiveCleared=
      selfUserId!=='' &&
      executiveOfficialAGX!=='' &&
      selfUserId===executiveOfficialAGX

    // Normal users author their own records.
    // Executive-cleared users may enter on behalf of another user.
    const requestedAuthorId=
      String(input.authorUserId||'').trim()

    let authorData=selfData
    let authorFirebaseUid=decoded.uid
    let enteredOnBehalf=false

    if(requestedAuthorId && requestedAuthorId!==selfUserId){

      if(!isExecutiveCleared){
        return NextResponse.json(
          {error:'Executive clearance is required to enter a record on behalf of another user.'},
          {status:403}
        )
      }

      const authorSnapshot=await adminDb
        .collection('users')
        .where('id','==',requestedAuthorId)
        .limit(1)
        .get()

      if(authorSnapshot.empty){
        return NextResponse.json(
          {error:'Selected author was not found in the users collection.'},
          {status:404}
        )
      }

      const authorDoc=authorSnapshot.docs[0]
      authorData=authorDoc.data()
      authorFirebaseUid=String(authorData.uid||'')
      enteredOnBehalf=true
    }

    const authorUserId=String(authorData.id||'').trim()

    const authorName=String(
      authorData.displayName||
      authorData.username||
      authorData.email||
      authorUserId
    )

    const enteredByName=String(
      selfData.displayName||
      selfData.username||
      selfData.email||
      selfUserId
    )

    // Keep archive numbering deterministic within each record type.
    const prefix=prefixMap[type]||'ARC'
    const year=new Date().getFullYear()

    const {count,error:countError}=await supabase
      .from('archive_records')
      .select('*',{count:'exact',head:true})
      .ilike('archive_id',`FAM-${prefix}-${year}-%`)

    if(countError){
      return NextResponse.json(
        {error:countError.message},
        {status:500}
      )
    }

    const nextNumber=(count||0)+1
    const archiveId=
      `FAM-${prefix}-${year}-${String(nextNumber).padStart(4,'0')}`

    const now=new Date().toISOString()

    const contentHash=hash(JSON.stringify({
      archiveId,
      type,
      title,
      body,
      authorUserId,
      authorFirebaseUid,
      enteredByUserId:selfUserId,
      enteredByFirebaseUid:decoded.uid
    }))

    const {data:record,error:recordError}=await supabase
      .from('archive_records')
      .insert({
        archive_id:archiveId,
        type,
        title,
        originality:'native',
        status:'archived',
        current_version:1,
        original_creation_at:origin
          ? `${origin}T00:00:00`
          : null,
        archived_at:now,
        integrity_hash:contentHash
      })
      .select()
      .single()

    if(recordError){
      return NextResponse.json(
        {error:recordError.message},
        {status:500}
      )
    }

    const {error:versionError}=await supabase
      .from('archive_versions')
      .insert({
        record_id:record.id,
        version_number:1,
        title,
        body,
        content_hash:contentHash
      })

    if(versionError){
      await supabase
        .from('archive_records')
        .delete()
        .eq('id',record.id)

      return NextResponse.json(
        {error:versionError.message},
        {status:500}
      )
    }

    await supabase
      .from('archive_events')
      .insert({
        record_id:record.id,
        event_type:'ARCHIVE_ENTERED',
        actor_id:null,
        payload:{
          author_user_id:authorUserId,
          author_firebase_uid:authorFirebaseUid,
          author_name:authorName,
          entered_by_user_id:selfUserId,
          entered_by_firebase_uid:decoded.uid,
          entered_by_name:enteredByName,
          entered_on_behalf:enteredOnBehalf,
          executive_official_clearance:isExecutiveCleared,
          type,
          integrity_hash:contentHash
        }
      })

    return NextResponse.json({
      success:true,
      archiveId,
      type,
      author:{
        id:authorUserId,
        name:authorName
      },
      enteredBy:{
        id:selfUserId,
        name:enteredByName
      },
      enteredOnBehalf,
      integrityHash:contentHash
    })

  }catch(error:any){
    console.error('FAM archive create error:',error)

    return NextResponse.json(
      {error:error?.message||'Archive creation failed.'},
      {status:500}
    )
  }
}
