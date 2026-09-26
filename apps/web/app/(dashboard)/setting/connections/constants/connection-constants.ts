export enum ModalsNameConnection {
  createConnection = "createConnection",
  updateConnection = "updateConnection",
  deleteConnection = "deleteConnection",
}

export const ModalsTitleConnection: Record<ModalsNameConnection, string> = {
  [ModalsNameConnection.createConnection]: "Crear conexión",
  [ModalsNameConnection.updateConnection]: "Actualizar conexión",
  [ModalsNameConnection.deleteConnection]: "",
};
