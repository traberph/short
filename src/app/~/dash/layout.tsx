// layout for dashboard

import Link from 'next/link';
import React, { ReactNode } from 'react';


export default function Dashboard({ children }: { children: ReactNode }) {
    return (
        <div>
            <Link href="/~/dash/">
                <h1>Dashboard</h1>
            </Link>
            {children}
        </div>
    );
}