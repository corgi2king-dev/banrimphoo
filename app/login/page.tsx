'use client';
import dynamic from 'next/dynamic';
import './login.css';

const LoginForm = dynamic(() => import('@/components/LoginForm'), { ssr: false });
export default function Page() { return <LoginForm />; }
