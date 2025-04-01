import prisma from "../../../../../prisma/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import DeletePageForm from "@/components/forms/deletePageForm";
import CustomPageDashboard from "@/components/CustomPageDashboard";
import LinkFavicon from "@/components/LinkFavicon";
import { hashToColor } from "@/utils";
import PinPageToRootForm from "@/components/forms/pinPageToRootForm";
import { ArrowTopRightOnSquareIcon, BookmarkIcon } from "@heroicons/react/24/solid";
import QRCode from "@/components/QRCode";
import ResetStatsForm from "@/components/forms/resetStatsForm";
import LineChart from "@/components/LineChart";
import { getDailyStats, getPageData, getPageStats, getCustomPageData } from "@/actions/stats";

interface PageProps {
    params: Promise<{
        uuid: string
    }>
}

export default async function DetailedStats({ params }: PageProps) {
    const { uuid } = await params;

    const [page, pageStats] = await Promise.all([
        getPageData(uuid),
        getPageStats(uuid)
    ]);

    if (!page) {
        redirect("/~/dash");
    }

    const redirectPage = page.redirectPage[0];
    const customPage = page.customPage[0];

    // get custom page data if needed
    const customPageData = customPage ? await getCustomPageData(customPage.uuid) : undefined;

    // Get chart data using server action
    const chartData = await getDailyStats(uuid);

    return (
        <div>
            <div className="flex justify-between max-sm:flex-col mb-10">
                <div className="flex">
                {redirectPage || customPage.image ?
                    <div className=" h-10 w-10  mr-4 ">
                        {redirectPage ? <LinkFavicon url={redirectPage.dest} /> :
                            <Image
                                src={`data:image/png;base64,${customPage.image}`}
                                width={100}
                                height={100}
                                alt=" "
                                className="rounded-full"
                            />}
                    </div>
                    : ""}

                <div>
                    <p>Shortcode: {page.shortcode}</p>
                    {page.redirectPage.length > 0 ?
                        <p><a className="underline" href={page.redirectPage[0].dest}>{page.redirectPage[0].dest}</a></p> : ""}
                </div>
                <div className="ml-5">
                    {page.pinnedPage ? <BookmarkIcon className="button-icon common-red"/> : ""}
                </div>
                </div>

                <div className="flex max-sm:mt-5">

                <div className="">
                    <Link href={`/${page.shortcode}`} target="blank"><button><ArrowTopRightOnSquareIcon className="button-icon" /></button></Link>
                </div>
                <div className="ml-5">
                    <PinPageToRootForm pageUuid={page.uuid} pinned={!!page.pinnedPage} />
                </div>
                <div className="ml-5">
                    <DeletePageForm uuid={page.uuid} />
                </div>

                </div>
            </div>
            <div className="mb-10"> 
                <QRCode url={page.shortcode} />
            </div>

            {customPage ? <CustomPageDashboard customPage={customPage} linkBlocks={customPageData?.linkBlocks || []} shortcodes={customPageData?.shortcodes || []} /> : ""}

            <div className="flex justify-between items-center mt-10">
                <h2 className="m-0">Stats</h2>
                <div className="ml-auto">
                    <ResetStatsForm uuid={page.uuid} />
                </div>
            </div>
            <p className="my-2">Clicks today: {pageStats.clicksToday}</p>
            <p className="my-2">Last visit: {pageStats.lastVisit?.toLocaleString()}</p>
            <p className="my-2">Unique visitors: {pageStats.stats.length}</p>
            <p className="my-2">All clicks: {page._count.stat}</p>

            <h3 className="mt-10">Last 7 Days</h3>
            <LineChart data={chartData} />

            <h3 className="mt-10">All Visits</h3>
            {pageStats.stats.map((stat) => (<div className="zebra" key={stat.hash}>
                <p style={{ color: hashToColor(stat.hash) }}>{stat.userAgent}</p>
                <p>Visits: {"" + stat._count.uuid}</p>
                <p>Last Visit: {stat._max.accessedAt?.toLocaleString()}</p>
            </div>))}
        </div>
    );
}