import React from 'react';
import prisma from '@/../prisma/prisma'
import CreateRedirectPageForm from '@/components/forms/createRedirectPageForm';
import CreateCustomPageForm from '@/components/forms/createCustomPageForm';
import PageListComponent from '@/components/PageListComponent';


export default async function Dashboard() {

    const pages = await prisma.page.findMany({
        include: {
            pinnedPage: true,
            redirectPage: true,
            customPage: true,
            _count: {
                select: { stat: true }
            }
        }
    });

    const redirectPages = pages.filter((page) => page.redirectPage.length > 0);
    const customPages = pages.filter((page) => page.customPage.length > 0);
    const pinnedPage = await prisma.pinnedPage.findFirst({ where: { id: 1 } });

    return (<>
        <h2>Redirect Pages</h2>
        {redirectPages.map((page) => (
            <PageListComponent key={page.uuid} page={page} />))}
        <h2 className='mt-11'>Create Redirect Page</h2>
        <CreateRedirectPageForm />

        <h2 className='mt-11'>Custom Pages</h2>
        {customPages.map((page) => (<PageListComponent key={page.uuid} page={page} />))}
        <h2 className='mt-11'>Create Custom Page</h2>
        <CreateCustomPageForm />
    </>
    );
}