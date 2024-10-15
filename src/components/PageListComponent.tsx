import React from 'react';
import type { Prisma } from '@prisma/client';
import DeletePageForm from './forms/deletePageForm';
import Image from 'next/image';
import Link from 'next/link';
import prisma from '../../prisma/prisma';
import LinkFavicon from './LinkFavicon';

type PageWithRelations = Prisma.PageGetPayload<{
    include: {
        RedirectPage: true;
        CustomPage: true;
        _count: {
            select: { Stat: true }
        }
    }
}>

export default async function PageListComponent({ page }: { page: PageWithRelations }) {

    const redirectPage = page.RedirectPage[0];
    const customPage = page.CustomPage[0];

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
                        />}
                </div>
                <div>
                    <p className="font-bold text-lg text-white">{page.shortcode}</p>
                    <p className="text-sm text-gray-400">{redirectPage ? redirectPage.dest : customPage.title}</p>

                </div>
                <div className="ml-auto">
                    {page._count.Stat ? <p className="text-gray-400 font-bold">{page._count.Stat} visits</p> : ""}
                    {//<DeletePageForm uuid={page.uuid} />
                    }
                </div>
            </div>
        </Link>


    );
}