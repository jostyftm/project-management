import { useQuery } from "@tanstack/react-query";
import { getExampleByIdService } from "../services/example-service";
import { ExampleType } from "@/types/example-type";

const useSourceById = (id: string) => {
    return useQuery<ExampleType>({
        queryKey: ["source", "by-id", id],
        enabled: !!id,
        queryFn: async () => {
            const res = await getExampleByIdService(id);
            return res.data;
        },
    });
};

export default useSourceById;