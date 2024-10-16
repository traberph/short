import React from 'react';
import type { Prisma } from '@prisma/client';
import Image from 'next/image';
import Link from 'next/link';
import LinkFavicon from './LinkFavicon';
import PinPageToRootForm from './forms/pinPageToRootForm';

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
            <div className="w-full my-3 flex items-center hover:bg-slate-600 rounded p-1">
                <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center mr-4">
                    {redirectPage ? <LinkFavicon url={redirectPage.dest} /> :
                        <Image
                            loading='lazy'
                            width={100}
                            height={100}
                            src={`data:image/png;base64,${customPage.image}`}
                            alt="icon"
                            className="rounded-full"
                        />}
                </div>
                <div>
                    <p className="font-bold text-lg text-white">{page.shortcode}</p>
                    <p className="text-sm text-gray-400">{redirectPage ? redirectPage.dest : customPage.title}</p>

                </div>
                <div className="ml-5">
                    {page.pinnedPage ? <p className="text-red-500">Pinned to root</p> : ""}
                </div>
                <div className="ml-auto">
                    {page._count.stat ? <p className="text-gray-400 font-bold">{page._count.stat} visits</p> : ""}
                    {//<DeletePageForm uuid={page.uuid} />
                    }
                </div>
            </div>
        </Link>


    );
}