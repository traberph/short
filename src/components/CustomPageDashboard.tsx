import { CustomPage } from "@prisma/client"
import prisma from "../../prisma/prisma"
import CreateLinkBlockForm from "./forms/createLinkBlockForm"
import DeleteLinkBlockForm from "./forms/deleteLinkBlockForm"

export default async function CustomPageDashboard(params: { customPage: CustomPage }) {

    const customPage = params.customPage
    const redirectPages = await prisma.redirectPage.findMany({ include: { page: true } })
    const shortcodes = redirectPages.map((p) => p.page.shortcode)

    const linkBlocks = await prisma.linkBlock.findMany({
        where: {
            customPageUuid: customPage.uuid
        },
        orderBy: {
            order: "asc"
        },
        include: {
            redirect_page: { include: { page: true } }
        }
    });

    return (<>
        {linkBlocks.map((block) => (

            <div key={block.uuid} className="flex items-center justify-center mb-2 odd:bg-slate-800 p-2">
                <div className="mr-5">order: {block.order}</div>
                <div className="mr-5">title: <span className="font-bold">{block.title}</span></div>
                <div>connected link page: <span className="font-bold">{block.redirect_page.page.shortcode}</span></div>
                <div className="ml-auto">
                    <button>
                        <a href={`/${block.redirect_page.page.shortcode}`} className="btn btn-primary">Visit</a>
                    </button>
                </div>
                <div className="ml-5">
                    <button>
                        <a href={`/~/dash/${block.redirect_page.page.uuid}`} className="btn btn-primary">Details</a>
                    </button>
                </div>
                <div className="ml-5">
                    <DeleteLinkBlockForm linkBlockUuid={block.uuid} />
                </div>
            </div>
        ))}
        <h2>Add new link page connection</h2>
        <CreateLinkBlockForm customPage={customPage.uuid} shortcodes={shortcodes || []} />

    </>
    )
}