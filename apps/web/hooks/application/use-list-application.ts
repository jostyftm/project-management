import { requestMyApplications } from "@/services/auth/application-service";
import { IApplication } from "@/types/application-type";
import { PaginatedResponse, PaginateResourcesProps } from "@/types/paginate";
import { useQuery } from "@tanstack/react-query";

interface Props {
    params?: PaginateResourcesProps;
}

const useListApplication = ({ params }: Props) => {

    const safeParams = params ?? { params: {} };
    const { data, error, refetch, isPending } = useQuery<
        PaginatedResponse<IApplication>
    >({
        queryKey: ["applications", safeParams],
        queryFn: async () => await requestMyApplications(),
        throwOnError: false,
    });


    return {
        applications: data?.data,
        isLoading: isPending,
        refetch,
        error,
    }


};

export default useListApplication;
