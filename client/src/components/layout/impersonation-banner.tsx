import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { ROUTES } from '@/app/router/routes';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { endPlatformImpersonation } from '@/features/platform/api/platform-impersonation-api';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import { Button } from '@/components/ui/button';

export function ImpersonationBanner() {
  const { session, refetch } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const endMutation = useMutation({
    mutationFn: endPlatformImpersonation,
    onSuccess: async (result) => {
      await refetch();
      queryClient.clear();
      toast.success('Đã kết thúc đăng nhập thay');
      navigate(result.redirectTo || ROUTES.platform, { replace: true });
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(
          apiError?.code,
          apiError?.message ?? 'Không thể kết thúc đăng nhập thay',
        ),
      );
    },
  });

  if (!session?.impersonation) {
    return null;
  }

  return (
    <div className='flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/40 bg-amber-500/15 px-6 py-2 text-sm text-amber-950 dark:text-amber-100'>
      <p>
        Đang xem với quyền system admin —{' '}
        <span className='font-semibold'>
          {session.impersonation.targetSchoolName}
        </span>
        {session.impersonation.mode === 'read_only' ? (
          <span className='ml-2 text-xs opacity-80'>(chỉ xem)</span>
        ) : null}
      </p>
      <Button
        size='sm'
        variant='outline'
        className='border-amber-600/40 bg-background/60'
        disabled={endMutation.isPending}
        onClick={() => endMutation.mutate()}
      >
        {endMutation.isPending ? 'Đang thoát…' : 'Thoát về nền tảng'}
      </Button>
    </div>
  );
}
