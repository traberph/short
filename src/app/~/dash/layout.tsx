// layout for dashboard

import Link from 'next/link';
import React, { ReactNode } from 'react';


export default function Dashboard({ children }: { children: ReactNode }) {
    return (
        <div className='p-10 max-w-7xl mx-auto'>
            <Link href="/~/dash/">
                <h1>Dashboard</h1>
            </Link>
            {children}
        </div>
    );
}