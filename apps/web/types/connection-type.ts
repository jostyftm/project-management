import { LaravelDriverCode } from "./catalog-type";

export interface DatabaseConnection {
  type: string;
  id: number;
  attributes: {
    name: string;
    host: string | null;
    port: string | null;
    db_name: string | null;
    schema: string | null;
    username: string | null;
    has_password: boolean;
    tns_string: string | null;
    created_at: string;
    updated_at: string;
  };
  relationships: {
    driver: {
      id: number;
      name: string;
      laravel_driver: LaravelDriverCode;
    } | null;
  };
}
