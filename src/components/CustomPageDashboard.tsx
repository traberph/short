"use client"

import { CustomPage } from "@prisma/client"
import prisma from "../../prisma/prisma"
import CreateLinkBlockForm from "./forms/createLinkBlockForm"
import DeleteLinkBlockForm from "./forms/deleteLinkBlockForm"
import { ArrowTopRightOnSquareIcon, ArrowTrendingUpIcon } from "@heroicons/react/24/solid"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { updateLinkBlockOrder } from "@/actions/block_actions"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function CustomPageDashboard({ customPage, linkBlocks, shortcodes }: { 
    customPage: CustomPage,
    linkBlocks: any[],
    shortcodes: string[]
}) {
    const router = useRouter();
    const [localLinkBlocks, setLocalLinkBlocks] = useState(linkBlocks);

    const handleDragEnd = async (result: any) => {
        if (!result.destination) return;

        const items = Array.from(localLinkBlocks);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        
        // Update local state immediately
        setLocalLinkBlocks(items);

        // Update the database in the background
        const formData = new FormData();
        formData.append("linkBlockUuid", reorderedItem.uuid);
        formData.append("newOrder", result.destination.index + 1);
        
        await updateLinkBlockOrder(null, formData);
    };

    return (<>
        <h2 className="mb-5">Links on Page</h2>
        <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="links">
                {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef}>
                        {localLinkBlocks.map((block, index) => (
                            <Draggable key={block.uuid} draggableId={block.uuid} index={index}>
                                {(provided) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className="flex items-center justify-between zebra max-sm:flex-col max-sm:items-start"
                                    >
                                        <div className="flex">
                                            <div className="mr-5">title: <span className="font-bold">{block.title}</span></div>
                                            <div>link page: <span className="font-bold">{block.redirectPage.page.shortcode}</span></div>
                                        </div>
                                        <div className="flex max-sm:mt-3 max-sm:w-full max-sm:justify-between">
                                            <button>
                                                <a href={`/${block.redirectPage.page.shortcode}`} className="btn btn-primary"><ArrowTopRightOnSquareIcon className="button-icon" /></a>
                                            </button>
                                            <button className="ml-3">
                                                <a href={`/~/dash/${block.redirectPage.page.uuid}`} className="btn btn-primary"><ArrowTrendingUpIcon className="button-icon" /></a>
                                            </button>
                                            <DeleteLinkBlockForm linkBlockUuid={block.uuid} />
                                        </div>
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
        <h2 className="mt-10">Add new link page connection</h2>
        <CreateLinkBlockForm customPage={customPage.uuid} shortcodes={shortcodes || []} />
    </>)
}