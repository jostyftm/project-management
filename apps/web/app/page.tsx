import { redirect } from "next/navigation";

const handleRedirect = () => {
  redirect("/login");
};

export default function Home() {
  return handleRedirect();
}
