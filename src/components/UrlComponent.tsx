import React from 'react';
import type { URL as PrismaURL } from '@prisma/client';
import DeleteUrlForm from './forms/deleteUrlForm';
import Image from 'next/image';
import Link from 'next/link';

export default function UrlComponent({ url }: { url: PrismaURL }) {

    return (
        <Link href={`/~/dash/${url.short_code}`}>
        <div className="w-full my-3 flex items-center hover:bg-slate-600 rounded p-1">
                <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center mr-4">
                    <Image
                        loading='lazy'
                        width={100}
                        height={100}
                        src={`https://www.google.com/s2/favicons?domain=${url.original_url}`}
                        alt="favicon"
                        />
                </div>
            <div>
                <p className="font-bold text-lg text-white">{url.short_code}</p>
                <p className="text-sm text-gray-400">{url.original_url}</p>
            </div>
            <div className="ml-auto">
                <DeleteUrlForm url_id={url.url_id} />
            </div>
        </div>
        </Link>


    );
}