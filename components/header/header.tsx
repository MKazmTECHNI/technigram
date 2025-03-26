import "./header.css";
import Link from "next/link";

export default function Header() {
  return (
    <header>
      <nav>
        <Link href={"/"}>Home</Link>
        <Link href={"/profile"}>Profile</Link>
        <Link href={"/add-post"}>Add Post</Link>
      </nav>
      <h1 className="logoText">TECHNIGRAM</h1>
      <nav>
        <Link href={"/changelog"}>Changelog</Link>
        <Link href={"/login"}>Login</Link>
        <Link href={"/rules"}>Rules</Link>
      </nav>
    </header>
  );
}
