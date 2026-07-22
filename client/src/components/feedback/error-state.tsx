import { Button } from '@/components/ui/button';

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className='flex min-h-40 flex-col items-center justify-center gap-3 text-center'>
      <p className='max-w-md text-sm text-destructive'>{message}</p>
      {onRetry ? (
        <Button variant='outline' size='sm' onClick={onRetry}>
          Thử lại
        </Button>
      ) : null}
    </div>
  );
}
