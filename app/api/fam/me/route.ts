import {NextResponse} from 'next/server'
import {adminAuth, adminDb} from '../../../../lib/firebase-admin'

export const runtime = 'nodejs'

export async function GET(request:Request){
  try{
    const authorization=request.headers.get('authorization')||''

    if(!authorization.startsWith('Bearer ')){
      return NextResponse.json(
        {error:'Authentication required.'},
        {status:401}
      )
    }

    const token=authorization.slice(7)

    // Verify the Firebase user's identity server-side.
    const decoded=await adminAuth.verifyIdToken(token)

    // Find the user's existing FAM/DMNDX profile.
    const usersSnapshot=await adminDb
      .collection('users')
      .where('uid','==',decoded.uid)
      .limit(1)
      .get()

    if(usersSnapshot.empty){
      return NextResponse.json(
        {
          authenticated:true,
          authorized:false,
          error:'Your Firebase account is valid, but no FAM user profile was found.'
        },
        {status:403}
      )
    }

    const userDoc=usersSnapshot.docs[0]
    const userData=userDoc.data()

    // Existing FAM executive clearance source.
    const companyDoc=await adminDb
      .collection('companies')
      .doc('futureArchivesModern')
      .get()

    const companyData=companyDoc.exists
      ? companyDoc.data()||{}
      : {}

    const userId=String(userData.id||'').trim()

    const executiveOfficialAGX=
      String(companyData.executiveofficialAGX||'').trim()

    // This is FAM's existing clearance rule:
    // users.id === companies/futureArchivesModern.executiveofficialAGX
    const isExecutiveCleared=
      !!userId &&
      !!executiveOfficialAGX &&
      userId===executiveOfficialAGX

    const displayName=
      String(
        userData.displayName||
        userData.username||
        decoded.name||
        decoded.email||
        'FAM User'
      )

    return NextResponse.json({
      authenticated:true,
      authorized:true,

      user:{
        uid:decoded.uid,
        id:userId,
        email:String(
          userData.email||
          decoded.email||
          ''
        ),
        displayName,
        username:String(userData.username||''),
        status:String(userData.status||''),
      },

      authorization:{
        role:isExecutiveCleared?'admin':'member',
        executiveOfficialAGX:isExecutiveCleared,
        canEnterOnBehalf:isExecutiveCleared,
      }
    })

  }catch(error:any){
    console.error('FAM identity error:',error)

    return NextResponse.json(
      {
        authenticated:false,
        authorized:false,
        error:error?.message||'Unable to verify FAM identity.'
      },
      {status:401}
    )
  }
}
