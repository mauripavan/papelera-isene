import { SignJWT, jwtVerify } from 'jose';
import Cookies from 'js-cookie';
import { NextResponse } from 'next/server';

const secretKey = process.env.NEXT_PUBLIC_JWT_SECRET;
const key = new TextEncoder().encode(secretKey);

export interface LoginForm {
  email: string;
  admin: boolean;
  username: string;
}

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2 weeks from now')
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ['HS256'],
  });
  return payload;
}

export async function loginSession(formData: LoginForm) {
  // Verify credentials && get the user
  const { email, admin, username } = formData;
  const user = { email: email, admin: admin, username: username };

  // Create the session
  const expires = new Date(Date.now() + 14 * 24 * 60 * 60);
  const session = await encrypt({ user, expires });

  // Save the session in a cookie
  Cookies.set('session', session, {
    expires,
    path: '/',
    domain: '.onrender.com',
  });
}

export async function logout() {
  // Destroy the session
  Cookies.set('session', '', { expires: new Date(0) });
}

export async function getSession() {
  const session = Cookies.get('session');
  if (!session) return null;
  return await decrypt(session);
}

export async function updateSession() {
  const session = Cookies.get('session');
  if (!session) return;

  // Refresh the session so it doesn't expire
  const parsed = await decrypt(session);
  parsed.expires = new Date(Date.now() + 14 * 24 * 60 * 60);
  const res = NextResponse.next();
  const newSession = await encrypt(parsed);
  Cookies.set('session', newSession, { expires: 14, path: '/' });
  return res;
}
