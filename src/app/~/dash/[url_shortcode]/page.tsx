import Image from "next/image";
import prisma from "../../../../../prisma/prisma";
import DeleteUrlForm from "@/components/forms/deleteUrlForm";
import { notFound } from "next/navigation";

export default async function DetailedStats({ params }: { params: { url_shortcode: string } }) {

    const url = await prisma.uRL.findUnique({
        where: {
            short_code: params.url_shortcode
        }
    });

    const stats = await prisma.stat.findMany({
        where: {
            url_id: url?.url_id
        }
    });

    if (!url) {
        return notFound();
    }

    return (
        <div>
            <h2>Stats</h2>
            <div className="flex items-center">
                <div className=" h-10 w-10  mr-4 ">
                    <Image src={`https://www.google.com/s2/favicons?domain=${url?.original_url}`} alt="favicon" width={100} height={100} />
                </div>

                <div>
                    <p>Shortcode: {url?.short_code}</p>
                    <p><a className="underline" href={url?.original_url}>{url?.original_url}</a></p>
                </div>
                <div className="ml-auto">
                    <DeleteUrlForm url_id={url?.url_id} />
                </div>
            </div>

            {stats.map((stat) => (<div className="my-5" key={stat.stat_id}>
                <p>{stat.accessed_at.toDateString()}</p>
                <p>{stat.user_agent}</p>
                <p>{stat.hashed_ip}</p>
            </div>))}
        </div>
    );
}