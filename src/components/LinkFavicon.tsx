import Image from "next/image";

export default function LinkFavicon({ url }: { url: string }) {

    const hostname = new URL(url).hostname;

    return (
        <Image
            src={`https://logo.clearbit.com/${hostname}?`}
            width={100}
            height={100}
            alt=" "
            className="rounded-full"
        />
    );
}