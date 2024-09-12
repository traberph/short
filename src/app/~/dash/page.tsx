import React from 'react';
import prisma from '@/../prisma/prisma'
import CreateUrlForm from '@/components/forms/createUrlForm';
import UrlComponent from '@/components/UrlComponent';


export default async function Dashboard() {

    const urls = await prisma.uRL.findMany();
 

    return (<>
        <h2>URLs</h2>
        <div>
            {urls.map((url) => (
                <UrlComponent key={url.url_id} url={url}/>
            ))}
        </div>
        <h2 className='mt-11'>Create URL</h2>
        <CreateUrlForm/>
    </>
    );
}