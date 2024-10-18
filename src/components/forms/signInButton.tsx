import { signIn } from "@/auth"

export default function SignInButton() {
    return (<div>
        <form
            action={async () => {
                "use server"
                await signIn("authentik")
            }}
        >
            <button type="submit">Sign In</button>
        </form>
    </div>
    )
} 