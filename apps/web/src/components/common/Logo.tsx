import Image from "next/image";
import Link from "next/link";
import React from "react";
import { webImages } from "@packages/ui/assets/web";

interface Props {
  isMobile?: boolean;
}

const Logo = ({ isMobile }: Props) => {
  return (
    <Link href={"/"}>
      <div className="flex gap-2 items-center">
        <Image src={webImages.logoMark} width={26} height={26} alt="logo" />
        {!isMobile ? (
          <h1 className="font-montserrat text-black text-3xl sm:text-[35px] not-italic font-normal leading-[90.3%] tracking-[-0.875px]">
            UseNotes
          </h1>
        ) : null}
      </div>
    </Link>
  );
};

export default Logo;
