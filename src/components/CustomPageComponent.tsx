import { CustomPage } from "@prisma/client";
import Image from "next/image";
import prisma from "../../prisma/prisma";
import LinkFavicon from "./LinkFavicon";

export default async function CustomPageComponent(params: { customPage: CustomPage }) {
  const customPage = params.customPage;

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
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Image
        src={`data:image/png;base64,${customPage.image}`}
        alt=" "
        width={100}
        height={100}
        className="rounded-full"
      />

      <h1 className="mt-5 text-center">{customPage.title}</h1>
      <div className="w-full max-w-96 mb-40 p-2">

        {linkBlocks.map((block) => (
          <button key={block.uuid} className="bg-slate-600 hover:bg-slate-500 w-full my-2">
            <a href={`/${block.redirectPage.page.shortcode}`}>
              <div className="relative flex items-center">
                <div className="flex-shrink-0"><LinkFavicon url={block.redirectPage.dest} /></div>
                <div className="absolute left-1/2 transform -translate-x-1/2 text-center font-bold">{block.title}</div>
              </div>
            </a>
          </button>
        ))}
      </div>
      <div className="text-slate-700"><a className="underline" target="blank" href="https://github.com/traberph/short">traberph/short</a> by me running on <a className="underline" href="https://k3s.io/" target="blank">K3s</a></div>
    </div>
  );
}