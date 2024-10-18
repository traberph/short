import toast from "react-hot-toast";

export function hashToColor(hash: string | null): string {
    if (!hash) {
        return "black";
    }
    const r = parseInt(hash.slice(0, 2), 16);
    const g = parseInt(hash.slice(2, 4), 16);
    const b = parseInt(hash.slice(4, 6), 16);
    const color = `rgb(${r}, ${g}, ${b})`;
    return color;
}

export function handleToast(state: { message: string, error?: any }) {
    if (state.message) {
        console.log(state);
        if (state.error) {
            toast.error(state.message);
        } else {
            toast.success(state.message);
        }
    }
}