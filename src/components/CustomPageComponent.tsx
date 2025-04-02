import { CustomPage } from "@prisma/client";
import Image from "next/image";
import prisma from "../../prisma/prisma";
import LinkFavicon from "./LinkFavicon";

export default async function CustomPageComponent(params: { customPage: CustomPage }) {
  const customPage = params.customPage;

  const token = process.env.LOGO_DEV_TOKEN;
  const disableAttribution = process.env.DISABLE_ATTRIBUTION;

  const linkBlocks = await prisma.linkBlock.findMany({
    where: {
      customPageUuid: customPage.uuid
    },
    orderBy: {
      order: "asc"
    },
    include: {
      redirectPage: { include: { page: true } }
    }
  });

  return (
    <div className="vcenter">
      <Image
        src={`data:image/png;base64,${customPage.image}`}
        alt=" "
        width={100}
        height={100}
        className="rounded-full zoom-animated"
      />

      <h1 className="my-10 text-center zoom-animated">{customPage.title}</h1>
      <div className="w-full max-w-96 p-2">

        {linkBlocks.map((block, index) => (
          <button
            key={block.uuid}
            className="bg-slate-600 hover:bg-slate-500 w-full my-2 slide-animated"
            style={{ animationDelay: `${1.5 + index * 0.1}s` }}
          >
            <a href={`/${block.redirectPage.page.shortcode}`}>
              <div className="relative flex items-center">
                <div className="flex-shrink-0 w-8 h-8"><LinkFavicon url={block.redirectPage.dest} /></div>
                <div className="absolute left-1/2 transform -translate-x-1/2 text-center font-bold">{block.title}</div>
              </div>
            </a>
          </button>
        ))}
      </div>
      <div
        className="text-slate-700 mt-10 fade-animated"
        style={{ animationDelay: `${1.5 + linkBlocks.length * 0.1}s`, opacity: 0 }}
      >

        {disableAttribution ? null : <p className="text-center">powered by <a className="underline" target="blank" href="https://github.com/traberph/short">traberph/short</a></p>}
        {token ? <p className="text-center">Logos provided by <a className="underline" href="https://logo.dev" alt="Logo API">Logo.dev</a></p> : ""}
      </div>
    </div>
  );
}