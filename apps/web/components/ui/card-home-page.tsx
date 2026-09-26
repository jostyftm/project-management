"use client";
import React from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "./button";
import BaseIcon from "./base-icon";
import { useRouter } from "next/navigation";

interface Props {
  title?: string;
  children: React.ReactNode;
  backRoute?: string;
  hiddenCard?: boolean;
}

export const CardHomePage = ({
  title,
  children,
  backRoute,
  hiddenCard = false,
}: Props) => {
  const { replace } = useRouter();
  return (
    <section className="">
      <div className="flex gap-2">
        <Button
          variant={"ghost"}
          onClick={backRoute ? () => replace(backRoute) : () => {}}
          hidden={!Boolean(backRoute)}
          className="cursor-pointer"
        >
          <BaseIcon name="ArrowLeft" size={20} />
        </Button>
        {title && <h4 className="mb-3 text-2xl font-bold relative">{title}</h4>}
      </div>
      {!hiddenCard ? (
        <Card>
          <CardContent>{children}</CardContent>
        </Card>
      ) : (
        <>{children}</>
      )}
    </section>
  );
};
