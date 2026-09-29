'use client'

import {
  GoogleAuthProvider,
  browserLocalPersistence,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import {useEffect,useState} from 'react'
import {useRouter} from 'next/navigation'
import {auth} from '../lib/firebase'
import styles from './FamSignIn.module.css'

type Profile={
  authenticated:boolean
  authorized:boolean
  user?:{
    uid:string
    id:string
    email:string
    displayName:string
    username:string
    status:string
  }
  authorization?:{
    role:'admin'|'member'
    executiveOfficialAGX:boolean
    canEnterOnBehalf:boolean
  }
  error?:string
}

export default function FamSignIn(){
  const router=useRouter()

  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [profile,setProfile]=useState<Profile|null>(null)
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')

  useEffect(()=>{
    return onAuthStateChanged(auth,async user=>{
      setLoading(true)

      if(!user){
        setProfile(null)
        setLoading(false)
        return
      }

      try{
        const token=await user.getIdToken()

        const response=await fetch('/api/fam/me',{
          headers:{
            Authorization:`Bearer ${token}`,
          },
        })

        const data=await response.json()

        if(!response.ok){
          setError(data.error||'Your account could not be authorized for FAM.')
          setProfile(null)
        }else{
          setProfile(data)
        }
      }catch(err:any){
        setError(err?.message||'Unable to load FAM identity.')
      }finally{
        setLoading(false)
      }
    })
  },[])

  async function signIn(){
    if(!email.trim()||!password){
      setError('Enter your email and password.')
      return
    }

    setBusy(true)
    setError('')

    try{
      await setPersistence(auth,browserLocalPersistence)

      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      )
    }catch(err:any){
      setError(authMessage(err?.code))
    }finally{
      setBusy(false)
    }
  }

  async function googleSignIn(){
    setBusy(true)
    setError('')

    try{
      await setPersistence(auth,browserLocalPersistence)

      const provider=new GoogleAuthProvider()

      await signInWithPopup(auth,provider)
    }catch(err:any){
      setError(authMessage(err?.code))
    }finally{
      setBusy(false)
    }
  }

  async function resetPassword(){
    if(!email.trim()){
      setError('Enter your email first.')
      return
    }

    setBusy(true)
    setError('')

    try{
      await sendPasswordResetEmail(
        auth,
        email.trim()
      )

      setError('Password reset email sent.')
    }catch(err:any){
      setError(authMessage(err?.code))
    }finally{
      setBusy(false)
    }
  }

  async function logout(){
    await signOut(auth)
    setProfile(null)
  }

  if(loading){
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.brand}>
            <div className={styles.logo}>FAM</div>
            <div className={styles.subtitle}>
              Future Archives Modern
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.eyebrow}>
              Identity
            </div>

            <div className={styles.title}>
              Verifying…
            </div>

            <div className={styles.description}>
              Establishing your authenticated FAM identity.
            </div>
          </div>
        </div>
      </div>
    )
  }

  if(profile?.authorized && profile.user){
    const isAdmin=profile.authorization?.executiveOfficialAGX===true

    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.brand}>
            <div className={styles.logo}>FAM</div>
            <div className={styles.subtitle}>
              Future Archives Modern
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.eyebrow}>
              Authenticated Identity
            </div>

            <div className={styles.title}>
              Identity established.
            </div>

            <div className={styles.description}>
              FAM has verified your existing Firebase account.
              Your authenticated identity will automatically become
              the author of records you create.
            </div>

            <div className={styles.identity}>
              <div className={styles.identityLabel}>
                Author
              </div>

              <div className={styles.identityName}>
                {profile.user.displayName}
              </div>

              <div className={styles.identityMeta}>
                {profile.user.email}
              </div>

              {isAdmin ? (
                <div className={styles.clearance}>
                  ✓ Executive Official Clearance ·
                  Enter On Behalf Enabled
                </div>
              ) : (
                <div className={styles.member}>
                  Authenticated FAM Member ·
                  Author Attribution Automatic
                </div>
              )}
            </div>

            <div className={styles.actions}>
              <button
                className={styles.secondary}
                onClick={()=>router.push('/')}
              >
                Continue to Archive
              </button>

              <button
                className={styles.secondary}
                onClick={logout}
              >
                Sign Out
              </button>
            </div>
          </div>

          <div className={styles.footer}>
            Author identity comes from your authenticated account.
            Administrative entry is separately recorded from authorship.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>

        <div className={styles.brand}>
          <div className={styles.logo}>FAM</div>
          <div className={styles.subtitle}>
            Future Archives Modern
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.eyebrow}>
            FAM Identity System
          </div>

          <div className={styles.title}>
            Sign in.
          </div>

          <div className={styles.description}>
            Sign in with your existing FAM / DMNDX Firebase account.
            Your authenticated identity will be used for archival authorship.
          </div>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <div className={styles.field}>
            <label>Email</label>

            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={e=>setEmail(e.target.value)}
              onKeyDown={e=>{
                if(e.key==='Enter') signIn()
              }}
              placeholder="you@example.com"
            />
          </div>

          <div className={styles.field}>
            <label>Password</label>

            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e=>setPassword(e.target.value)}
              onKeyDown={e=>{
                if(e.key==='Enter') signIn()
              }}
              placeholder="••••••••"
            />
          </div>

          <button
            className={styles.primary}
            onClick={signIn}
            disabled={busy}
          >
            {busy ? 'Authenticating…' : 'Sign In'}
          </button>

          <div className={styles.divider}>
            Or
          </div>

          <button
            className={styles.google}
            onClick={googleSignIn}
            disabled={busy}
          >
            Continue with Google
          </button>

          <button
            className={styles.reset}
            onClick={resetPassword}
            disabled={busy}
          >
            Forgot password?
          </button>
        </div>

        <div className={styles.footer}>
          FAM uses Firebase Authentication for identity.
          Archive authorship and administrative entry are recorded separately.
        </div>

      </div>
    </div>
  )
}

function authMessage(code?:string){
  switch(code){
    case 'auth/invalid-credential':
      return 'The email or password is incorrect.'
    case 'auth/user-not-found':
      return 'No Firebase account was found for this email.'
    case 'auth/wrong-password':
      return 'The email or password is incorrect.'
    case 'auth/invalid-email':
      return 'Enter a valid email address.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait and try again.'
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled.'
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in window.'
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled in Firebase.'
    default:
      return code
        ? `Authentication error: ${code}`
        : 'Authentication failed.'
  }
}
