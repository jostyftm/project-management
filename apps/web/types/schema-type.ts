export interface SchemaColumn {
  name: string;
  type: string | null;
}

export interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
}

export interface ConnectionSchema {
  type: string;
  id: number;
  attributes: {
    tables: SchemaTable[];
  };
}