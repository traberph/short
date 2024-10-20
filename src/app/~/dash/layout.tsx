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
        <div className='p-10 max-w-7xl mx-auto max-sm:px-6'>
            <div className='flex justify-between max-sm:flex-col mb-10'>

                <Link href="/~/dash/">
                    <h1>Dashboard</h1>
                </Link>

                <div className="flex flex-col max-sm:mt-5 justify-start">
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