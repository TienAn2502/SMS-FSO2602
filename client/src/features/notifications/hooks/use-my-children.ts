import { fetchMyChildren } from '@/features/portal/api/portal-api';
import { useQuery } from '@tanstack/react-query';

const useMyChildren = () => {
    const {
        data: children = [],
        isLoading,
        isError,
        refetch,
    } = useQuery({
        queryKey: ['portal', 'my-children'],
        queryFn: fetchMyChildren,
    });

    return {
        children,
        isLoading,
        isError,
        refetch,
    };
};

export default useMyChildren;
