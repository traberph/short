import Image from "next/image";

export default function LinkFavicon({ url }: { url: string }) {

    const hostname = new URL(url).hostname;
    const token = process.env.LOGO_DEV_TOKEN;
    if (!token) {
        const text = hostname.split(".")[0].charAt(0).toUpperCase();
        return (
            <span className="rounded-full w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-600">
                {text}
            </span>
        )
    }

    return (
        <Image
            src={`https://img.logo.dev/${hostname}?token=${token}`}
            width={100}
            height={100}
            alt=" "
            className="rounded-full"
        />
    );
}