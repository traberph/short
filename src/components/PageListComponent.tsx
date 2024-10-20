import React from 'react';
import type { Prisma } from '@prisma/client';
import Image from 'next/image';
import Link from 'next/link';
import LinkFavicon from './LinkFavicon';
import PinPageToRootForm from './forms/pinPageToRootForm';
import { BookmarkIcon } from '@heroicons/react/24/solid';

type PageWithRelations = Prisma.PageGetPayload<{
    include: {
        pinnedPage: true;
        redirectPage: true;
        customPage: true;
        _count: {
            select: { stat: true }
        }
    }
}>

export default async function PageListComponent({ page }: { page: PageWithRelations }) {

    const redirectPage = page.redirectPage[0];
    const customPage = page.customPage[0];


    return (
        <Link href={`/~/dash/${page.uuid}`}>
            <div className='flex justify-between items-center hover:bg-slate-700 my-2 p-1 rounded'>
                <div className='flex items-center'>
                    <div className='w-8 h-8'>
                    {redirectPage ?
                        <LinkFavicon url={redirectPage.dest} /> :
                        <Image
                            loading='lazy'
                            width={100}
                            height={100}
                            src={`data:image/png;base64,${customPage.image}`}
                            alt="icon"
                            className="rounded-full"
                        />}
                    </div>
                    <div className='ml-3'>
                        <p className="font-bold text-lg text-white">{page.shortcode}</p>
                        <p className="text-sm text-gray-400">{redirectPage ? redirectPage.dest : customPage.title}</p>
                    </div>
                    <div className="ml-5">
                        {page.pinnedPage ? <BookmarkIcon className='button-icon common-red'/> : ""}
                    </div>
                </div>
                <div>
                    {page._count.stat ? <p className="text-gray-400 font-bold text-right">{page._count.stat} visits</p> : ""}
                </div>
            </div>
        </Link>


    );
}