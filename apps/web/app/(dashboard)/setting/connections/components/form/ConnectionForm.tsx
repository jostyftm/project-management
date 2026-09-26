"use client";
import React, { useCallback, useState } from "react";
import { ModalActionType } from "@/hooks/zustand/use-modal-action-store";
import { useCatalogStore } from "@/hooks/zustand/use-catalog-store";
import { LaravelDriverCode } from "@/types/catalog-type";
import { ConnectionFormValues } from "../../types/connection-types";
import { ConnectionFormInner } from "./ConnectionFormInner";

interface Props {
  values?: Partial<ConnectionFormValues>;
  closeModal?: () => void;
  action: ModalActionType;
  initialDriver?: LaravelDriverCode | null;
}

const ConnectionForm = ({
  values,
  closeModal,
  action,
  initialDriver = null,
}: Props) => {
  const [driverCode, setDriverCode] = useState<LaravelDriverCode | null>(
    initialDriver
  );

  return (
    <ConnectionFormInner
      key={driverCode ?? "none"}
      values={values}
      closeModal={closeModal}
      action={action}
      driverCode={driverCode}
      onDriverChange={setDriverCode}
    />
  );
};

export default ConnectionForm;
