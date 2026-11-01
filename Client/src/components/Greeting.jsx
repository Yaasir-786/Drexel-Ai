// Greeting: centered welcome heading shown on empty chat screens
import { useSelector } from "react-redux";

export default function Greeting() {
  const { user } = useSelector((state) => state.auth);
  const firstName = (user?.name || "").trim().split(/\s+/)[0] || "";

  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="relative font-serif text-3xl md:text-4xl font-bold tracking-tight text-ink">
        {firstName ? "Hi, " : "Hi"}
        {firstName}
      </h1>
      <p className="relative font-serif text-xl md:text-2xl text-muted mt-2">
        How can I help you today?
      </p>
    </div>
  );
}
