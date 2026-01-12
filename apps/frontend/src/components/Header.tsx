import Logo from "@/assets/images/logo.svg?react";

function Header() {
  return (
    <header className="flex items-center px-6 py-4 bg-white border-b border-gray-200">
      <Logo className="h-8" />
    </header>
  );
}

export default Header;
