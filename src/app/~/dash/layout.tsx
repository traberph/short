// layout for dashboard

import Link from 'next/link';
import React, { ReactNode } from 'react';
import { Toaster } from "react-hot-toast";
import { auth } from "@/auth";
import { redirect } from 'next/navigation';
import SignOutButton from '@/components/forms/signOutButton';


export default async function Dashboard({ children }: { children: ReactNode }) {

    const session = await auth();
    const awSession = await session;
    const user = awSession?.user;

    if (!user) {
        redirect("/~/");
    }

    return (
        <div className='p-10 max-w-7xl mx-auto'>
            <div className='flex justify-top'>

                <Link href="/~/dash/">
                    <h1>Dashboard</h1>
                </Link>
                <div className="ml-auto flex flex-col">
                    {user?.name ? <>
                        <div>{user?.name || user.email}</div>
                        <SignOutButton /></> : ""}
                </div>
            </div>
            <Toaster position='top-right' />
            {children}
        </div>
    );
}