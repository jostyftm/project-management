import { API_URL } from "@/config/enviroments";
import { reportRequestService } from "@/lib/request-report";
import { DatabaseDriver, DestinationType, FileFormat } from "@/types/catalog-type";

const url = API_URL('report', 'v1');

export interface CatalogBag {
  drivers: DatabaseDriver[];
  formats: FileFormat[];
  destinations: DestinationType[];
}

type ResourceCollection<T> = { data: T[] };

export const requestCatalogs = (): Promise<CatalogBag> => {
  const drivers = reportRequestService<ResourceCollection<DatabaseDriver>>({
    url: `${url}/database-drivers`,
    method: "GET",
  }).catch(() => ({ data: [] as DatabaseDriver[] }));

  const formats = reportRequestService<ResourceCollection<FileFormat>>({
    url: `${url}/file-formats`,
    method: "GET",
  }).catch(() => ({ data: [] as FileFormat[] }));

  const destinations = reportRequestService<ResourceCollection<DestinationType>>({
    url: `${url}/destination-types`,
    method: "GET",
  }).catch(() => ({ data: [] as DestinationType[] }));

  return Promise.all([drivers, formats, destinations]).then(
    ([driverData, formatData, destinationData]) => ({
      drivers: Array.isArray(driverData?.data) ? driverData.data : [],
      formats: Array.isArray(formatData?.data) ? formatData.data : [],
      destinations: Array.isArray(destinationData?.data) ? destinationData.data : [],
    })
  );
};
